"use client";

import type { OverallFeedback, QuestionFeedback } from "@/lib/evaluation/schema";
import type { EvalContext, EvalItem } from "@/lib/evaluation/prompts";
import { answerMetrics } from "@/lib/metrics";
import { MODELS, modelById, type Usage } from "@/lib/models";
import { newId, type Evaluation, type ExamResult } from "@/lib/exam/result";

// Up to 8 answers per request: fewer requests stretch the small daily free quotas further.
const MAX_BATCH = 8;
// Flash models allow 5 requests a minute on the free tier.
const PARALLEL = 2;
const RATE_RETRIES = 4;

export type Progress = { modelId: string; batchesDone: number; batches: number; overall: "pending" | "done" | "error" };

/** The model has no free quota left today; grading restarts on the next model. */
class OutForToday extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post<T>(path: string, body: unknown): Promise<T & { usage: Usage }> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return data;
    if (data.kind === "daily") throw new OutForToday(data.error);
    // Per-minute limits and busy servers clear quickly; wait as long as the provider asks, then send the same request again.
    if (data.kind === "rate" && attempt < RATE_RETRIES) {
      await sleep(Math.min(Math.max(Number(data.retryAfter) || 15, 3), 60) * 1000);
      continue;
    }
    throw new Error(data.error ?? `평가 요청 실패 (${res.status})`);
  }
}

/** Runs tasks with at most `limit` in flight. */
async function pool(tasks: (() => Promise<void>)[], limit: number) {
  const queue = [...tasks];
  await Promise.all(
    Array.from({ length: Math.min(limit, queue.length) }, async () => {
      try {
        while (queue.length) await queue.shift()!();
      } catch (e) {
        queue.length = 0; // stop the other workers from spending quota on a run that will be thrown away
        throw e;
      }
    }),
  );
}

/** Evenly sized batches: 15 answers → 8 + 7, 12 → 6 + 6. */
function split<T>(items: T[]): T[][] {
  const count = Math.ceil(items.length / MAX_BATCH);
  const size = Math.ceil(items.length / count);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

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
 * If a model runs out of daily quota midway, its partial work is dropped and the test is graded again
 * on the next model, so one report never mixes two graders.
 */
export async function evaluate(r: ExamResult, available: string[], onProgress: (p: Progress) => void): Promise<Evaluation> {
  const items = buildItems(r);
  if (!items.length) throw new Error("받아쓴 답변이 없어 평가할 수 없습니다.");
  for (const m of MODELS) {
    if (!available.includes(m.id)) continue;
    try {
      return await evaluateWith(r, items, m.id, onProgress);
    } catch (e) {
      if (!(e instanceof OutForToday)) throw e;
    }
  }
  throw new Error("오늘 쓸 수 있는 무료 평가 한도를 모두 썼습니다. 한도는 매일 오후 4시(11월~3월은 오후 5시)에 다시 채워집니다.");
}

async function evaluateWith(r: ExamResult, items: EvalItem[], modelId: string, onProgress: (p: Progress) => void): Promise<Evaluation> {
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

  const runBatch = async (b: EvalItem[]) => {
    try {
      const res = await post<{ items: QuestionFeedback[] }>("/api/evaluate/questions", { model: modelId, context: ctx(b) });
      questions.push(...res.items);
      usage.inputTokens += res.usage.inputTokens;
      usage.outputTokens += res.usage.outputTokens;
    } catch (e) {
      if (e instanceof OutForToday) throw e;
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
      if (e instanceof OutForToday) throw e;
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
