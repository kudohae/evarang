import { describe, expect, it } from "vitest";
import type { Attempt } from "@/lib/domain/attempt";
import type { Session } from "@/lib/domain/session";
import { recordAttempt } from "@/lib/practice/record";

const session = (id: string, attempts: Attempt[] = []): Session => ({ id, kind: "drill", createdAt: 1, settings: {}, attempts });
const attempt = (sessionId: string, n: number, extra: Partial<Attempt> = {}): Attempt => ({ id: `${sessionId}:${n}`, sessionId, source: "drill", createdAt: 1, question: { text: "Q", type: "past" }, ...extra });

describe("recordAttempt", () => {
  it("updates the open session", async () => {
    const saved: Session[] = [];
    const out = await recordAttempt(session("s1", [attempt("s1", 1)]), attempt("s1", 1, { modelId: "m" }), { get: async () => null, save: async (s) => void saved.push(s) });
    expect(out?.attempts).toHaveLength(1);
    expect(out?.attempts[0].modelId).toBe("m");
    expect(saved[0].id).toBe("s1");
  });

  it("a late save from an earlier session goes to that session, not the open one", async () => {
    const stored: Record<string, Session> = { old1: session("old1", [attempt("old1", 1)]) };
    const saved: Session[] = [];
    const open = session("new1");
    const out = await recordAttempt(open, attempt("old1", 1, { modelId: "late" }), {
      get: async (id) => stored[id] ?? null,
      save: async (s) => void saved.push(s),
    });
    expect(out).toBe(open);
    expect(open.attempts).toHaveLength(0);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("old1");
    expect(saved[0].attempts[0].modelId).toBe("late");
  });
});
