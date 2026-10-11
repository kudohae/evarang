"use client";

import type { OverallFeedback, QuestionFeedback } from "@/lib/evaluation/schema";
import type { EvalContext, EvalItem } from "@/lib/evaluation/prompts";
import { answerMetrics } from "@/lib/metrics";
import { modelById, type Usage } from "@/lib/models";
import { newId, type Evaluation, type ExamResult } from "@/lib/exam/result";

const BATCH = 5;

export type Progress = { batchesDone: number; batches: number; overall: "pending" | "done" | "error" };

async function post<T>(path: string, body: unknown): Promise<T & { usage: Usage }> {
  const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `평가 요청 실패 (${res.status})`);
  return data;
}

export function buildItems(r: ExamResult): EvalItem[] {
  return r.questions.map((question) => {
    const answer = r.answers.find((a) => a.number === question.number);
    return {
      question,
      transcript: answer?.transcript?.text ?? "",
      metrics: answer ? answerMetrics(answer) : null,
    };
  });
}

export async function evaluate(r: ExamResult, modelId: string, onProgress: (p: Progress) => void): Promise<Evaluation> {
  const model = modelById(modelId);
  if (!model) throw new Error("알 수 없는 모델입니다.");
  const items = buildItems(r);
  const ctx = (subset: EvalItem[]): EvalContext => ({ startLevel: r.startLevel, finalLevel: r.finalLevel, items: subset });
  const batches: EvalItem[][] = [];
  for (let i = 0; i < items.length; i += BATCH) batches.push(items.slice(i, i + BATCH));

  const progress: Progress = { batchesDone: 0, batches: batches.length, overall: "pending" };
  onProgress({ ...progress });

  const usage: Usage = { inputTokens: 0, outputTokens: 0 };
  const errors: string[] = [];
  const questions: QuestionFeedback[] = [];
  let overall: OverallFeedback | undefined;

  const runBatch = async (b: EvalItem[]) => {
    try {
      const res = await post<{ items: QuestionFeedback[] }>("/api/evaluate/questions", { model: modelId, context: ctx(b) });
      questions.push(...res.items);
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
    } catch (e) {
      errors.push(`${b[0].question.number}~${b[b.length - 1].question.number}번 첨삭: ${(e as Error).message}`);
    }
    progress.batchesDone++;
    onProgress({ ...progress });
  };

  const runOverall = async () => {
    try {
      const res = await post<{ overall: OverallFeedback }>("/api/evaluate/overall", { model: modelId, context: ctx(items) });
      overall = res.overall;
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
      progress.overall = "done";
    } catch (e) {
      errors.push(`종합 판정: ${(e as Error).message}`);
      progress.overall = "error";
    }
    onProgress({ ...progress });
  };

  if (model.provider === "groq") {
    // Groq's free tier allows few tokens per minute; one request at a time.
    for (const b of batches) await runBatch(b);
    await runOverall();
  } else {
    await Promise.all([runOverall(), ...batches.map(runBatch)]);
  }

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
