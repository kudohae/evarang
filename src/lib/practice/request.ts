"use client";

import { postFeedback, runOnLadder } from "@/lib/feedback/ladder";
import type { StructureFeedback } from "@/lib/feedback/structure";
import { chosenTakes, FRAME, takeStats, type StructureDrill } from "@/lib/practice/structure";
import type { ExamQuestion, Level } from "@/lib/types";

/** Judges the four chosen takes together, on the model ladder (the member's own key first). */
export async function requestStructureFeedback(o: { ref: string; question: ExamQuestion; drill: StructureDrill; level: Level; available: string[] }): Promise<{ feedback: StructureFeedback; modelId: string }> {
  const chosen = chosenTakes(o.drill);
  const parts = FRAME.map((p) => {
    const t = chosen[p.id]!;
    return { part: p.id, transcript: t.transcript?.text ?? "", ...takeStats(t) };
  });
  const body = { ref: o.ref, level: o.level, question: { type: o.question.type, text: o.question.text }, parts };
  return runOnLadder(o.available, "full", async (modelId, mayHandOff) => {
    const res = await postFeedback<{ feedback: StructureFeedback }>("/api/feedback/structure", { ...body, model: modelId }, () => mayHandOff);
    return { feedback: res.feedback, modelId };
  });
}
