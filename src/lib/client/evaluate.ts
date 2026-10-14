"use client";

import type { OverallFeedback, QuestionFeedback } from "@/lib/feedback/schema";
import { BusyNow, OutForToday, QuotaReached, pool, postFeedback, runOnLadder, split } from "@/lib/feedback/ladder";
import type { EvalContext, EvalItem } from "@/lib/feedback/prompt";
import { answerMetrics } from "@/lib/metrics";
import { modelById, type Usage } from "@/lib/models";
import { newId, type Evaluation, type ExamResult } from "@/lib/exam/result";

// Flash models allow 5 requests a minute on the free tier.
const PARALLEL = 2;

export type Progress = { modelId: string; batchesDone: number; batches: number; overall: "pending" | "done" | "error" };

/** Answers whose transcription failed are left out: grading them as silence would be unfair. */
export function buildItems(r: ExamResult): EvalItem[] {
  return r.questions.flatMap((question) => {
    const answer = r.answers.find((a) => a.number === question.number);
    if (!answer?.transcript) return [];
    return [
      {
        question,
        transcript: answer.transcript.text,
        metrics: answerMetrics(answer),
      },
    ];
  });
}

/**
 * Grades the whole test with one model, starting from the best free model that is up today.
 * A model at its per-minute limit passes the test to the next one, so simultaneous tests spread across models.
 * If a model runs out of daily quota midway, its partial work is dropped and the test is graded again
 * on the next model, so one report never mixes two graders.
 */
export async function evaluate(r: ExamResult, available: string[], onProgress: (p: Progress) => void): Promise<Evaluation> {
  const items = buildItems(r);
  if (!items.length) throw new Error("받아쓴 답변이 없어 평가할 수 없습니다.");
  return runOnLadder(available, "full", (modelId, mayHandOff) => evaluateWith(r, items, modelId, onProgress, mayHandOff));
}

async function evaluateWith(
  r: ExamResult,
  items: EvalItem[],
  modelId: string,
  onProgress: (p: Progress) => void,
  mayHandOff: boolean,
): Promise<Evaluation> {
  const model = modelById(modelId);
  if (!model) throw new Error("알 수 없는 모델입니다.");
  const ctx = (subset: EvalItem[]): EvalContext => ({ startLevel: r.startLevel, finalLevel: r.finalLevel, items: subset });
  const batches = split(items);

  const progress: Progress = { modelId, batchesDone: 0, batches: batches.length, overall: "pending" };
  onProgress({ ...progress });

  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const errors: string[] = [];
  const questions: QuestionFeedback[] = [];
  let overall: OverallFeedback | undefined;
  let returned = 0;
  const spill = () => mayHandOff && returned === 0;

  const runBatch = async (b: EvalItem[]) => {
    try {
      const res = await postFeedback<{ items: QuestionFeedback[] }>("/api/feedback/answers", { model: modelId, lens: "exam", ref: r.id, context: ctx(b) }, spill);
      returned++;
      questions.push(...res.items);
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
    } catch (e) {
      if (e instanceof OutForToday || e instanceof BusyNow || e instanceof QuotaReached) throw e;
      errors.push(`${b[0].question.number}~${b[b.length - 1].question.number}번 첨삭: ${(e as Error).message}`);
    }
    progress.batchesDone++;
    onProgress({ ...progress });
  };

  const runOverall = async () => {
    try {
      const res = await postFeedback<{ overall: OverallFeedback }>("/api/feedback/overall", { model: modelId, lens: "exam", ref: r.id, context: ctx(items) }, spill);
      returned++;
      overall = res.overall;
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
      progress.overall = "done";
    } catch (e) {
      if (e instanceof OutForToday || e instanceof BusyNow || e instanceof QuotaReached) throw e;
      errors.push(`종합 판정: ${(e as Error).message}`);
      progress.overall = "error";
    }
    onProgress({ ...progress });
  };

  // Groq's free tier allows few tokens per minute, so it gets one request at a time.
  await pool([runOverall, ...batches.map((b) => () => runBatch(b))], model.provider === "groq" ? 1 : PARALLEL);

  return {
    id: newId(),
    modelId,
    createdAt: Date.now(),
    overall,
    questions: questions.sort((a, b) => a.number - b.number),
    usage,
    errors,
  };
}
