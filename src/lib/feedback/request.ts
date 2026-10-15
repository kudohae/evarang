"use client";

import { postFeedback, runOnLadder } from "@/lib/feedback/ladder";
import { LENSES, type LensId } from "@/lib/feedback/lenses";
import type { EvalContext } from "@/lib/feedback/prompt";
import { normalizeFeedback } from "@/lib/domain/from-exam";
import type { AnswerFeedback } from "@/lib/feedback/schema";
import { answerMetrics } from "@/lib/metrics";
import type { AnswerRecord, ExamQuestion, Level } from "@/lib/types";

/**
 * Feedback on one practice answer through the lens, on the free model ladder (the member's own key first).
 * The usage ledger counts it under `attemptId`, so a retry of the same answer is not counted again.
 */
export async function requestFeedback(o: {
  lens: LensId;
  attemptId: string;
  question: ExamQuestion;
  answer: AnswerRecord;
  level: Level;
  available: string[];
}): Promise<{ feedback: AnswerFeedback; modelId: string }> {
  if (!o.answer.transcript) throw new Error("받아쓴 답변이 없어 피드백을 받을 수 없습니다.");
  const context: EvalContext = {
    startLevel: o.level,
    finalLevel: o.level,
    items: [{ question: { ...o.question, number: 1 }, transcript: o.answer.transcript.text, metrics: answerMetrics(o.answer) }],
  };
  return runOnLadder(o.available, LENSES[o.lens].weight, async (modelId, mayHandOff) => {
    const res = await postFeedback<{ items: AnswerFeedback[] }>("/api/feedback/answers", { model: modelId, lens: o.lens, ref: o.attemptId, context }, () => mayHandOff);
    const item = res.items[0];
    if (!item) throw new Error("피드백이 비어 있습니다. 다시 시도하세요.");
    return { feedback: normalizeFeedback({ ...item, number: o.question.number }), modelId };
  });
}
