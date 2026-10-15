import { describe, expect, it } from "vitest";
import type { Attempt } from "@/lib/domain/attempt";
import type { AnswerFeedback } from "@/lib/feedback/schema";
import { cardsFromAttempts, mergeDuplicates, migrateState } from "@/lib/notes/cards";
import { countCards, filterCards, type NoteFilter } from "@/lib/notes/filters";
import { wordDiff } from "@/lib/notes/match";

const DAY = 86_400_000;
const attempt = (id: string, source: Attempt["source"], fb: Partial<AnswerFeedback>): Attempt => ({ id, sessionId: "s", source, createdAt: 1, question: { text: "Q", type: "past" }, feedback: fb as AnswerFeedback });

const corr = (o: string, c: string, skill?: string) => ({ original: o, corrected: c, kind: "grammar" as const, reason: "r", ...(skill ? { skill: skill as never } : {}) });

describe("card ids", () => {
  it("come from the fix itself, the same in every answer and on every device", () => {
    const a = cardsFromAttempts([attempt("e:2", "exam", { corrections: [corr("I go", "I went"), corr("a apple", "an apple")] })]);
    const b = cardsFromAttempts([attempt("p:9", "drill", { corrections: [corr("a apple.", "An apple"), corr("I  go", "I went")] })]);
    expect(new Set(a.map((c) => c.id))).toEqual(new Set(b.map((c) => c.id)));
    expect(a[0].id).toMatch(/^c:[a-z0-9]+$/);
  });

  it("old review states (index ids, attempt-based ids) move to the fix's id, the most-reviewed one winning", () => {
    const cards = cardsFromAttempts([
      { ...attempt("e:2", "exam", { corrections: [corr("I go", "I went")] }), createdAt: 1 },
      { ...attempt("e:5", "exam", { corrections: [corr("I go", "I went")] }), createdAt: 2 },
    ]);
    const moved = migrateState(
      {
        "e:2:c0": { box: 2, due: 5, reviews: 1 },
        [cards[1].oldIds[1]]: { box: 4, due: 9, reviews: 5, hidden: true },
      },
      cards,
    );
    expect(moved[cards[0].id]).toEqual({ box: 4, due: 9, reviews: 5, hidden: true });
    expect(Object.keys(moved)).toEqual([cards[0].id]);
  });
});

describe("filters", () => {
  const cards = cardsFromAttempts([
    attempt("e:1", "exam", { corrections: [corr("I go", "I went", "tense.past"), corr("a apple", "an apple", "grammar.article")] }),
    attempt("p:1", "drill", { corrections: [corr("he go", "he goes", "grammar.agreement"), corr("very good", "great")] }),
  ]);
  const now = 100 * DAY;
  const [past, article, agree, none] = cards;
  const state = { [article.id]: { box: 4, due: now + DAY, reviews: 3 }, [agree.id]: { box: 1, due: now + DAY, reviews: 1, hidden: true } };
  const f = (x: Partial<NoteFilter>): NoteFilter => ({ type: "all", status: "all", source: "all", ...x });

  it("by mistake type: a group, one skill, or unclassified", () => {
    expect(filterCards(cards, state, f({ type: "group:grammar" }), now).map((c) => c.id)).toEqual([article.id]);
    expect(filterCards(cards, state, f({ type: "tense.past" }), now)).toEqual([past]);
    expect(filterCards(cards, state, f({ type: "none" }), now)).toEqual([none]);
  });

  it("by status and source; hidden cards only under 숨김", () => {
    expect(filterCards(cards, state, f({ status: "due" }), now).map((c) => c.id).sort()).toEqual([past.id, none.id].sort());
    expect(filterCards(cards, state, f({ status: "learned" }), now)).toEqual([article]);
    expect(filterCards(cards, state, f({ status: "hidden" }), now)).toEqual([agree]);
    expect(filterCards(cards, state, f({ source: "practice" }), now)).toEqual([none]);
  });

  it("counts per group and skill for the chips, leaving hidden cards out", () => {
    const c = countCards(cards, state, now);
    expect(c.all).toEqual({ total: 3, due: 2 });
    expect(c["group:grammar"]).toEqual({ total: 1, due: 0 });
    expect(c["tense.past"]).toEqual({ total: 1, due: 1 });
    expect(c.none).toEqual({ total: 1, due: 1 });
    expect(c.learned).toBe(1);
  });
});

describe("wordDiff", () => {
  it("marks the target words that were not said", () => {
    expect(wordDiff("I go to the park", "I went to the park")).toEqual([
      { word: "I", said: true },
      { word: "went", said: false },
      { word: "to", said: true },
      { word: "the", said: true },
      { word: "park", said: true },
    ]);
  });
});

describe("mergeDuplicates", () => {
  it("the same fix from several answers is one card, counted, from every source it came from", () => {
    const cards = cardsFromAttempts([
      { ...attempt("e:1", "exam", { corrections: [corr("Very good.", "Absolutely amazing.")] }), createdAt: 1 },
      { ...attempt("e:2", "exam", { corrections: [corr("very good", "absolutely amazing"), corr("I go", "I went")] }), createdAt: 2 },
      { ...attempt("p:1", "drill", { corrections: [corr("very  good", "absolutely amazing")] }), createdAt: 3 },
    ]);
    const merged = mergeDuplicates(cards);
    expect(merged).toHaveLength(2);
    const amazing = merged.find((c) => /amazing/i.test(c.after))!;
    expect(amazing.times).toBe(3);
    expect(amazing.sources.sort()).toEqual(["exam", "practice"]);
    expect(merged.find((c) => c.after === "I went")!.times).toBe(1);
  });

  it("a repeat first seen in a mock test still shows under 연습", () => {
    const merged = mergeDuplicates(
      cardsFromAttempts([
        { ...attempt("e:1", "exam", { corrections: [corr("a b", "c d")] }), createdAt: 1 },
        { ...attempt("p:1", "drill", { corrections: [corr("a b", "c d")] }), createdAt: 2 },
      ]),
    );
    expect(filterCards(merged, {}, { type: "all", status: "all", source: "practice" }, 0)).toHaveLength(1);
  });
});
