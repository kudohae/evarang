import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AnswerBatchSchema, AnswerFeedbackSchema } from "@/lib/feedback/schema";

const base = {
  number: 1,
  verdict: "v",
  performance: "IM1",
  task: { result: "full", comment: "c" },
  corrections: [{ original: "a apartment", corrected: "an apartment", kind: "grammar", reason: "r" }],
  upgrades: [],
  structure: { opening: true, development: true, closing: false, comment: "c" },
  strengths: [],
  model_answer: "m",
};

describe("answer feedback schema", () => {
  it("rejects unknown skills", () => {
    expect(AnswerFeedbackSchema.safeParse({ ...base, skills: [{ skill: "made.up", verdict: "weak" }] }).success).toBe(false);
  });

  it("accepts no skills and corrections without a skill", () => {
    expect(AnswerFeedbackSchema.safeParse({ ...base, skills: [] }).success).toBe(true);
  });

  it("puts the skill list into the JSON schema as an enum", () => {
    const json = JSON.stringify(z.toJSONSchema(AnswerBatchSchema));
    expect(json).toContain('"structure.opening"');
    expect(json).toContain('"task.description"');
  });
});
