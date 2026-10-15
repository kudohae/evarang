import { describe, expect, it } from "vitest";
import type { AnswerFeedback } from "@/lib/feedback/schema";
import { LENSES } from "@/lib/feedback/lenses";
import { passedSteps, stepById, STEPS, stepVerdict } from "@/lib/practice/structure";

const fb = (skills: AnswerFeedback["skills"]) => ({ skills }) as AnswerFeedback;

describe("structure steps", () => {
  it("five steps, each on a real light lens", () => {
    expect(STEPS.map((s) => s.id)).toEqual(["opening", "reason", "example", "closing", "full"]);
    for (const s of STEPS) {
      expect(LENSES[s.lens].weight).toBe("light");
      expect(s.frames.length).toBeGreaterThanOrEqual(3);
      expect(s.types.length).toBeGreaterThan(0);
    }
  });

  it("a step's verdict reads its own skills; missing ones are unclear", () => {
    expect(stepVerdict(stepById("reason")!, fb([{ skill: "structure.reason", verdict: "strong" }]))).toEqual([{ skill: "structure.reason", verdict: "strong" }]);
    expect(stepVerdict(stepById("opening")!, fb([{ skill: "tense.past", verdict: "weak" }]))).toEqual([{ skill: "structure.opening", verdict: "unclear" }]);
    const full = stepVerdict(stepById("full")!, fb([{ skill: "structure.opening", verdict: "strong" }, { skill: "structure.closing", verdict: "weak" }]));
    expect(full.map((v) => v.verdict)).toEqual(["strong", "unclear", "unclear", "weak"]);
  });

  it("a step is passed once its skills were all strong in one answer", () => {
    const sessions = [
      { settings: { step: "opening" }, attempts: [{ feedback: fb([{ skill: "structure.opening", verdict: "weak" }]) }, { feedback: fb([{ skill: "structure.opening", verdict: "strong" }]) }] },
      { settings: { step: "reason" }, attempts: [{ feedback: fb([{ skill: "structure.reason", verdict: "weak" }]) }] },
      { settings: { step: "full" }, attempts: [{ feedback: undefined }] },
    ];
    expect([...passedSteps(sessions)]).toEqual(["opening"]);
  });
});
