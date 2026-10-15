import { describe, expect, it } from "vitest";
import { collectAttempts } from "@/lib/domain/collect";

describe("collectAttempts", () => {
  it("a malformed record is skipped, not fatal", () => {
    const good = { id: "e1", createdAt: 5, finalLevel: 5, questions: [{ number: 2, topicId: "home", topicLabel: "x", type: "past", text: "Q", scored: true }], answers: [], evaluations: [] };
    const broken = { id: "bad", createdAt: 9 };
    const out = collectAttempts([good, broken] as never, [{ attempts: [{ id: "s:1", createdAt: 7 }] }, { attempts: "nope" }] as never, [{ practice: [{ id: "st:1", createdAt: 1 }] }] as never);
    expect(out.attempts.map((a) => a.id)).toEqual(["s:1", "e1:2", "st:1"]);
    expect(out.level).toBe(5);
  });
});
