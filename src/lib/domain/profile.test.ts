import { describe, expect, it } from "vitest";
import type { Attempt } from "@/lib/domain/attempt";
import { skillProfile, suggestLens } from "@/lib/domain/profile";
import type { AnswerFeedback } from "@/lib/feedback/schema";

function attempt(id: string, createdAt: number, skills: AnswerFeedback["skills"] | undefined): Attempt {
  return {
    id,
    sessionId: "s",
    source: "exam",
    createdAt,
    question: { text: "Q", type: "past" },
    ...(skills ? { feedback: { skills } as AnswerFeedback } : {}),
  };
}

describe("skillProfile", () => {
  it("counts weak and strong marks, weakest first", () => {
    const p = skillProfile([
      attempt("a", 1, [{ skill: "tense.past", verdict: "weak" }, { skill: "structure.opening", verdict: "strong" }]),
      attempt("b", 5, [{ skill: "tense.past", verdict: "weak" }, { skill: "grammar.article", verdict: "weak" }]),
      attempt("c", 3, [{ skill: "grammar.article", verdict: "strong" }]),
      attempt("d", 9, undefined),
    ]);
    expect(p[0]).toEqual({ skill: "tense.past", weak: 2, strong: 0, lastSeen: 5 });
    expect(p.map((x) => x.skill)).toEqual(["tense.past", "grammar.article", "structure.opening"]);
    expect(p.find((x) => x.skill === "grammar.article")).toMatchObject({ weak: 1, strong: 1 });
  });

  it("old feedback without skills adds nothing", () => {
    const legacy = attempt("x", 1, undefined);
    legacy.feedback = {} as AnswerFeedback;
    expect(skillProfile([legacy])).toEqual([]);
  });
});

describe("suggestLens", () => {
  it("points at a question-type lens that watches the skill", () => {
    expect(suggestLens("tense.past")).toMatch(/^type\./);
    expect(suggestLens("task.questions")).toMatch(/^type\.(ask_ava|rp_ask)$/);
    expect(suggestLens("structure.closing")).toMatch(/^type\./);
  });
});
