import { describe, expect, it } from "vitest";
import { z } from "zod";
import { KINDS } from "@/lib/docs/kinds";
import { chosenTakes, emptyDrill, FRAME, newTakeId, readyToEvaluate, replaceTake, takeStats, withTake, type Take } from "@/lib/practice/structure";
import { StructureFeedbackSchema } from "@/lib/feedback/structure";

const take = (part: string, n: number, text?: string, ms = 8000): Take => ({
  id: `${part}-${n}`,
  audioKey: `s1:${part}-${n}`,
  mimeType: "audio/webm",
  durationMs: ms,
  createdAt: n,
  ...(text !== undefined ? { transcript: { text, words: [], audioSeconds: ms / 1000 } } : {}),
});

describe("structure frame", () => {
  it("four parts in answer order", () => {
    expect(FRAME.map((p) => p.id)).toEqual(["opening", "reason", "example", "feeling"]);
    for (const p of FRAME) expect(p.frames.length).toBeGreaterThanOrEqual(3);
  });

  it("the newest take is used unless another was chosen", () => {
    let d = emptyDrill();
    d = withTake(d, "opening", take("opening", 1, "I love parks."));
    d = withTake(d, "opening", take("opening", 2, "My favorite park is Seoul Forest."));
    expect(chosenTakes(d).opening?.id).toBe("opening-2");
    d = { ...d, chosen: { ...d.chosen, opening: "opening-1" } };
    expect(chosenTakes(d).opening?.id).toBe("opening-1");
  });

  it("evaluation waits for a transcribed take in every part", () => {
    let d = emptyDrill();
    for (const p of ["opening", "reason", "example"] as const) d = withTake(d, p, take(p, 1, "Some words here."));
    expect(readyToEvaluate(d)).toBe(false);
    d = withTake(d, "feeling", take("feeling", 1));
    expect(readyToEvaluate(d)).toBe(false);
    d = withTake(d, "feeling", take("feeling", 2, "That's why I love it."));
    expect(readyToEvaluate(d)).toBe(true);
  });

  it("measures each take", () => {
    expect(takeStats(take("opening", 1, "um I really like it", 6400))).toEqual({ seconds: 6.4, words: 4 });
  });

  it("a transcript arriving after the take was deleted does not bring it back", () => {
    let d = withTake(emptyDrill(), "opening", take("opening", 1));
    d = replaceTake(d, "opening", take("opening", 1, "I love parks."));
    expect(d.parts.opening.map((t) => t.transcript?.text)).toEqual(["I love parks."]);
    d = { ...d, parts: { ...d.parts, opening: [] } };
    expect(replaceTake(d, "opening", take("opening", 1, "late")).parts.opening).toEqual([]);
  });

  it("take ids never repeat after one is deleted, and fit the audio key rules", () => {
    const a = newTakeId("example");
    const b = newTakeId("example");
    expect(a).not.toBe(b);
    for (const id of [a, b]) expect(id).toMatch(/^example-[a-z0-9]+$/);
    expect(`${a}`.length).toBeLessThanOrEqual(40);
  });

  it("practice sessions name the frame's recordings", () => {
    let d = emptyDrill();
    d = withTake(d, "opening", take("opening", 1, "x"));
    d = withTake(d, "reason", take("reason", 3, "y"));
    expect(KINDS.session.audioKeys({ kind: "structure", attempts: [], structure: d }).sort()).toEqual(["opening-1", "reason-3"]);
  });
});

describe("StructureFeedbackSchema", () => {
  it("one verdict per part, from a fixed scale", () => {
    const ok = {
      parts: FRAME.map((p) => ({ part: p.id, verdict: "good", length: "적당", content: "좋음", better: "Better." })),
      flow: "자연스럽다",
      overall: "좋다",
      model_answer: "I'd say...",
    };
    expect(StructureFeedbackSchema.safeParse(ok).success).toBe(true);
    expect(StructureFeedbackSchema.safeParse({ ...ok, parts: [{ ...ok.parts[0], verdict: "great" }] }).success).toBe(false);
    expect(JSON.stringify(z.toJSONSchema(StructureFeedbackSchema))).toContain('"feeling"');
  });
});
