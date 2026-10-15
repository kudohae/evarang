import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDocs } from "@/lib/docs/local";
import { loadReviewState, saveReviewState } from "@/lib/notes/sync";

const ACCOUNT = { y: { box: 3, due: 50, reviews: 3 } };

function fakeAccount(opts: { failGet?: boolean } = {}) {
  const puts: unknown[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    if (method === "GET" && url.includes("/api/me/docs/note/reviewstate")) {
      if (opts.failGet) return Response.json({ error: "down" }, { status: 502 });
      return Response.json({ kind: "note", id: "reviewstate", updatedAt: 100, data: { cards: ACCOUNT }, audio: [] });
    }
    if (method === "PUT") puts.push(JSON.parse(String(init.body)));
    return Response.json({ ok: true });
  });
  return puts;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => vi.unstubAllGlobals());

describe("review state sync", () => {
  it("loads both copies merged, and saving keeps the other device's reviews", async () => {
    await localDocs.put("note", "reviewstate", { cards: { x: { box: 2, due: 10, reviews: 1 } } });
    const puts = fakeAccount();
    const loaded = await loadReviewState(true);
    expect(loaded.accountOk).toBe(true);
    expect(Object.keys(loaded.state).sort()).toEqual(["x", "y"]);

    const saved = await saveReviewState({ x: { box: 3, due: 20, reviews: 2 } }, { keep: true, accountOk: true, audio: true });
    expect(saved).toMatchObject({ x: { reviews: 2 }, y: ACCOUNT.y });
    const sent = puts.at(-1) as { data: { cards: Record<string, unknown> } };
    expect(Object.keys(sent.data.cards).sort()).toEqual(["x", "y"]);
  });

  it("when the account copy could not be read, nothing is sent over it", async () => {
    const puts = fakeAccount({ failGet: true });
    const loaded = await loadReviewState(true);
    expect(loaded.accountOk).toBe(false);
    await saveReviewState({ x: { box: 2, due: 1, reviews: 1 } }, { keep: true, accountOk: false, audio: true });
    expect(puts).toHaveLength(0);
    expect((await localDocs.get<{ cards: object }>("note", "reviewstate"))?.data?.cards).toHaveProperty("x");
  });
});
