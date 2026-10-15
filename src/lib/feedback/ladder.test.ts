import { beforeEach, describe, expect, it } from "vitest";
import { BusyNow, OutForToday, QuotaReached, runOnLadder } from "@/lib/feedback/ladder";
import { clearOwnKeyOut, onOwnKeyOut } from "@/lib/client/notices";
import { ApiError } from "@/lib/http";
import { MODELS, OWN_MODELS } from "@/lib/models";

const ALL = MODELS.map((m) => m.id);
const err = (kind: string) => new ApiError(429, { error: kind, kind });

describe("runOnLadder", () => {
  beforeEach(() => clearOwnKeyOut());

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

  it("a member's own key comes first, then the shared free models", async () => {
    const calls: string[] = [];
    const all = [...ALL, ...OWN_MODELS.map((m) => m.id)];
    await runOnLadder(all, "full", async (id) => {
      calls.push(id);
      if (id.startsWith("own:")) throw new OutForToday(err("daily"));
      return id;
    });
    expect(calls).toEqual([...OWN_MODELS.map((m) => m.id), "gemini-3.8-flash"]);
  });

  it("light work starts at Flash-Lite in both groups", async () => {
    const calls: string[] = [];
    await runOnLadder([...ALL, ...OWN_MODELS.map((m) => m.id)], "light", async (id) => {
      calls.push(id);
      throw new OutForToday(err("daily"));
    }).catch(() => {});
    expect(calls).toEqual(["own:gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "groq-gpt-oss"]);
  });

  it("tells the page once when the member's own key is out", async () => {
    const heard: string[] = [];
    const stop = onOwnKeyOut((m) => heard.push(m));
    await runOnLadder([...ALL, ...OWN_MODELS.map((m) => m.id)], "full", async (id) => {
      if (id.startsWith("own:")) throw new OutForToday(new ApiError(429, { error: "내 API 키가 거부되었습니다.", kind: "daily" }));
      return id;
    });
    stop();
    expect(heard).toEqual(["내 API 키가 거부되었습니다."]);
  });

  it("says nothing when only the site's models are out", async () => {
    const heard: string[] = [];
    const stop = onOwnKeyOut((m) => heard.push(m));
    await runOnLadder(ALL, "full", async (id) => {
      if (id === "gemini-3.8-flash") throw new OutForToday(err("daily"));
      return id;
    });
    stop();
    expect(heard).toEqual([]);
  });

  it("after the member's key is out, later runs skip it and say nothing again", async () => {
    const heard: string[] = [];
    const stop = onOwnKeyOut((m) => heard.push(m));
    const all = [...ALL, ...OWN_MODELS.map((m) => m.id)];
    await runOnLadder(all, "full", async (id) => {
      if (id.startsWith("own:")) throw new OutForToday(err("daily"));
      return id;
    });
    const calls: string[] = [];
    await runOnLadder(all, "full", async (id) => {
      calls.push(id);
      if (id.startsWith("own:")) throw new OutForToday(err("daily"));
      return id;
    });
    stop();
    expect(calls).toEqual(["gemini-3.8-flash"]);
    expect(heard).toHaveLength(1);
  });

  it("a saved key is tried again", async () => {
    const all = [...ALL, ...OWN_MODELS.map((m) => m.id)];
    await runOnLadder(all, "full", async (id) => {
      if (id.startsWith("own:")) throw new OutForToday(err("daily"));
      return id;
    });
    clearOwnKeyOut();
    const first = await runOnLadder(all, "full", async (id) => id);
    expect(first).toBe(OWN_MODELS[0].id);
  });
});
