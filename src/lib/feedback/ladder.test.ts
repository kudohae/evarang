import { describe, expect, it } from "vitest";
import { BusyNow, OutForToday, QuotaReached, runOnLadder } from "@/lib/feedback/ladder";
import { ApiError } from "@/lib/http";
import { MODELS } from "@/lib/models";

const ALL = MODELS.map((m) => m.id);
const err = (kind: string) => new ApiError(429, { error: kind, kind });

describe("runOnLadder", () => {
  it("ladder order and handoff", async () => {
    const calls: string[] = [];
    const result = await runOnLadder(ALL, "full", async (id) => {
      calls.push(id);
      if (id === "gemini-3.8-flash") throw new OutForToday(err("daily"));
      if (id === "gemini-3.7-flash") throw new BusyNow(err("rate"));
      return id;
    });
    expect(result).toBe("gemini-3.6-flash");
    expect(calls).toEqual(["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash"]);
  });

  it("waits on the first busy model when every model is busy", async () => {
    const calls: [string, boolean][] = [];
    const result = await runOnLadder(ALL, "full", async (id, mayHandOff) => {
      calls.push([id, mayHandOff]);
      if (mayHandOff) throw new BusyNow(err("rate"));
      return id;
    });
    expect(result).toBe("gemini-3.8-flash");
    expect(calls.slice(0, ALL.length).every(([, h]) => h)).toBe(true);
    expect(calls[ALL.length]).toEqual(["gemini-3.8-flash", false]);
  });

  it("light work starts at Flash-Lite", async () => {
    const calls: string[] = [];
    await runOnLadder(ALL, "light", async (id) => {
      calls.push(id);
      return id;
    });
    expect(calls[0]).toBe("gemini-3.5-flash-lite");
  });

  it("a spent usage quota stops the ladder", async () => {
    const calls: string[] = [];
    await expect(
      runOnLadder(ALL, "full", async (id) => {
        calls.push(id);
        throw new QuotaReached(err("quota"));
      }),
    ).rejects.toBeInstanceOf(QuotaReached);
    expect(calls).toEqual(["gemini-3.8-flash"]);
  });

  it("skips models that are not available", async () => {
    const calls: string[] = [];
    await runOnLadder(["gemini-3.6-flash", "groq-gpt-oss"], "full", async (id) => {
      calls.push(id);
      return id;
    });
    expect(calls).toEqual(["gemini-3.6-flash"]);
  });
});
