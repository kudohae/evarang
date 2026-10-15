import { describe, expect, it } from "vitest";
import type { Attempt } from "@/lib/domain/attempt";
import type { AnswerFeedback } from "@/lib/feedback/schema";
import { cardsFromAttempts } from "@/lib/notes/cards";
import { sayScore, saidRight } from "@/lib/notes/match";
import { dueCards, nextReview, INTERVAL_DAYS } from "@/lib/notes/review";

const DAY = 86_400_000;

function attempt(id: string, fb: Partial<AnswerFeedback>): Attempt {
  return { id, sessionId: "e1", source: "exam", createdAt: 10, question: { text: "Q", type: "past", number: 2 }, feedback: fb as AnswerFeedback };
}

describe("cardsFromAttempts", () => {
  it("makes one card per correction and upgrade", () => {
    const cards = cardsFromAttempts([
      attempt("e1:2", {
        corrections: [{ original: "I go", corrected: "I went", kind: "grammar", reason: "과거", skill: "tense.past" }],
        upgrades: [{ original: "very good", better: "amazing", reason: "더 생생", skill: "vocab.precision" }],
      }),
      attempt("e1:3", { corrections: [{ original: "a apple", corrected: "an apple", kind: "grammar", reason: "관사" }] }),
      { ...attempt("e1:4", {}), feedback: undefined },
    ]);
    expect(cards.map((c) => c.id)).toEqual(["e1:2:c0", "e1:2:u0", "e1:3:c0"]);
    expect(cards[0]).toMatchObject({ before: "I go", after: "I went", reason: "과거", kind: "correction", skill: "tense.past", attemptId: "e1:2" });
    expect(cards[1]).toMatchObject({ before: "very good", after: "amazing", kind: "upgrade" });
    expect(cards[2].skill).toBeUndefined();
  });
});

describe("review schedule", () => {
  it("climbs a box on a pass and drops to the first on a miss", () => {
    const now = 1_000 * DAY;
    const s1 = nextReview(undefined, true, now);
    expect(s1).toMatchObject({ box: 2, due: now + INTERVAL_DAYS[2] * DAY, reviews: 1 });
    const s2 = nextReview(s1, true, now);
    expect(s2.box).toBe(3);
    const top = nextReview({ box: 5, due: 0, reviews: 9 }, true, now);
    expect(top.box).toBe(5);
    const miss = nextReview(s2, false, now);
    expect(miss).toMatchObject({ box: 1, due: now, reviews: 3 });
  });

  it("new cards are due; future and hidden ones are not", () => {
    const now = 50 * DAY;
    const cards = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const state = { b: { box: 2, due: now + DAY, reviews: 1 }, c: { box: 1, due: now - 1, reviews: 1 }, d: { box: 1, due: 0, reviews: 0, hidden: true } };
    expect(dueCards(cards, state, now).map((c) => c.id)).toEqual(["c", "a"]);
  });
});

describe("sayScore", () => {
  it("compares words, ignoring case, punctuation and fillers", () => {
    expect(sayScore("Um, I WENT to the park.", "I went to the park")).toBe(1);
    expect(saidRight("I went to park", "I went to the park", "I go to the park")).toBe(true);
    // The fixed word is what matters: saying the old mistake again is a miss even when most words match.
    expect(saidRight("I go to the park", "I went to the park", "I go to the park")).toBe(false);
    expect(saidRight("I went to a park", "I went to the park")).toBe(true);
    expect(saidRight("we went", "I went to the park")).toBe(false);
    expect(sayScore("", "I went")).toBe(0);
    expect(sayScore("anything", "")).toBe(0);
  });
});
