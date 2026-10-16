import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putAudio } from "@/lib/client/db";
import type { Doc } from "@/lib/docs/kinds";
import { localDocs } from "@/lib/docs/local";
import { planPull, planSync, pullKind, pushDoc, syncKind } from "@/lib/docs/sync";
import type { ExamResult } from "@/lib/exam/result";

function exam(id: string, extra: Partial<ExamResult> = {}): ExamResult {
  return {
    id,
    createdAt: 1000,
    finishedAt: 2000,
    timedOut: false,
    survey: {} as ExamResult["survey"],
    startLevel: 4,
    adjustment: "same",
    finalLevel: 4,
    questions: [],
    answers: [{ number: 1, audioKey: `${id}:1`, mimeType: "audio/webm", durationMs: 1000, replayed: false }],
    evaluations: [],
    ...extra,
  };
}

const doc = (id: string, updatedAt: number, deletedAt?: number): Doc => ({ kind: "exam", id, updatedAt, ...(deletedAt ? { deletedAt } : {}), data: deletedAt ? null : {} });

type Call = { method: string; url: string; body?: unknown };

/** A stand-in for the account API: answers each call with the first matching rule. */
function fakeFetch(rules: ((c: Call) => Response | undefined)[]) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const c: Call = { method: init.method ?? "GET", url, body: typeof init.body === "string" ? JSON.parse(init.body) : init.body };
    calls.push(c);
    for (const rule of rules) {
      const res = rule(c);
      if (res) return res;
    }
    return Response.json({ ok: true });
  });
  return calls;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("planSync", () => {
  it("plan pushes newer local docs and drops remote deletions", () => {
    const plan = planSync(
      [doc("a", 5), doc("b", 7), doc("c", 4), doc("d", 2)],
      [
        { id: "a", updatedAt: 5 },
        { id: "b", updatedAt: 3 },
        { id: "c", updatedAt: 9, deletedAt: 9 },
      ],
      { a: { pushedVersion: 5, uploaded: [] }, b: { pushedVersion: 3, uploaded: [] }, c: { pushedVersion: 4, uploaded: [] } },
    );
    expect(plan.push.sort()).toEqual(["b", "d"]);
    expect(plan.dropLocal).toEqual(["c"]);
  });

  it("a local edit made after the remote deletion is pushed, not dropped", () => {
    const plan = planSync([doc("c", 12)], [{ id: "c", updatedAt: 9, deletedAt: 9 }], { c: { pushedVersion: 4, uploaded: [] } });
    expect(plan).toEqual({ push: ["c"], dropLocal: [] });
  });

  it("a local deletion is pushed while the account still has the doc", () => {
    const plan = planSync(
      [doc("x", 8, 8), doc("y", 8, 8)],
      [{ id: "x", updatedAt: 3 }, { id: "y", updatedAt: 9, deletedAt: 9 }],
      {},
    );
    expect(plan).toEqual({ push: ["x"], dropLocal: ["y"] });
  });

  it("a doc the account lost is pushed again", () => {
    expect(planSync([doc("z", 5)], [], { z: { pushedVersion: 5, uploaded: [] } }).push).toEqual(["z"]);
  });
});

describe("planPull", () => {
  it("fetches what only the account has, and what changed there since this browser last synced", () => {
    const ids = planPull(
      [doc("same", 5), doc("stale", 5), doc("edited-here", 8), doc("deleted-here", 9, 9), doc("never-sent", 3)],
      [
        { id: "same", updatedAt: 5 },
        { id: "stale", updatedAt: 7 },
        { id: "edited-here", updatedAt: 7 },
        { id: "deleted-here", updatedAt: 7 },
        { id: "only-there", updatedAt: 4 },
        { id: "gone-there", updatedAt: 6, deletedAt: 6 },
      ],
      { same: { pushedVersion: 5, uploaded: [] }, stale: { pushedVersion: 5, uploaded: [] }, "edited-here": { pushedVersion: 5, uploaded: [] } },
    );
    // edited-here: newer here, it goes up instead. deleted-here: the deletion goes up. never-sent: not there.
    expect(ids.sort()).toEqual(["only-there", "stale"]);
  });
});

describe("pullKind", () => {
  it("keeps the account's copies here, keeping this browser's own fields", async () => {
    await localDocs.put("exam", "old", exam("old", { research: { secret: "keep", uploaded: [] } }), { updatedAt: 1500 });
    await localDocs.setSync("exam", "old", { pushedVersion: 1500, uploaded: [] });
    const docs: Record<string, { updatedAt: number; data: ExamResult }> = {
      old: { updatedAt: 3000, data: exam("old", { actualGrade: "IH" }) },
      new: { updatedAt: 2000, data: exam("new") },
    };
    const calls = fakeFetch([
      (c) => (c.url.startsWith("/api/me/docs?kind=exam") ? Response.json({ docs: Object.entries(docs).map(([id, d]) => ({ id, updatedAt: d.updatedAt, summary: {} })) }) : undefined),
      (c) => {
        const id = c.url.match(/^\/api\/me\/docs\/exam\/([^/?]+)$/)?.[1];
        return id && docs[id] ? Response.json({ kind: "exam", id, ...docs[id], audio: ["1"] }) : undefined;
      },
    ]);

    expect((await pullKind("exam")).sort()).toEqual(["new", "old"]);
    const old = await localDocs.get<ExamResult>("exam", "old");
    expect(old?.updatedAt).toBe(3000);
    expect(old?.data?.actualGrade).toBe("IH");
    expect(old?.data?.research?.secret).toBe("keep");
    expect((await localDocs.get<ExamResult>("exam", "new"))?.updatedAt).toBe(2000);
    // Already in step: nothing is fetched again, and nothing pulled is pushed back.
    expect(await pullKind("exam")).toEqual([]);
    expect((await syncKind("exam")).push).toEqual([]);
    expect(calls.filter((c) => c.method !== "GET")).toEqual([]);
  });

  it("one copy that cannot be fetched does not stop the others", async () => {
    fakeFetch([
      (c) => (c.url.startsWith("/api/me/docs?kind=exam") ? Response.json({ docs: [{ id: "bad", updatedAt: 1, summary: {} }, { id: "good", updatedAt: 1, summary: {} }] }) : undefined),
      (c) => (c.url.endsWith("/bad") ? Response.json({ error: "x" }, { status: 500 }) : undefined),
      (c) => (c.url.endsWith("/good") ? Response.json({ kind: "exam", id: "good", updatedAt: 1, data: exam("good"), audio: [] }) : undefined),
    ]);
    expect(await pullKind("exam")).toEqual(["good"]);
  });
});

describe("pushDoc", () => {
  it("audio 503 keeps the record and retries later", async () => {
    await localDocs.put("exam", "ex1", exam("ex1"), { updatedAt: 1500 });
    await putAudio("ex1:1", new Blob(["sound"], { type: "audio/webm" }));
    let blobStore = false;
    const calls = fakeFetch([(c) => (c.url.includes("/audio/") && !blobStore ? Response.json({ error: "녹음 저장소가 설정되지 않았습니다." }, { status: 503 }) : undefined)]);

    const first = await pushDoc("exam", "ex1");
    expect(first.uploaded).toEqual([]);
    expect(first.error).toBeUndefined();
    expect(first.pushedVersion).toBe(1500);
    expect(calls.filter((c) => c.method === "PUT" && !c.url.includes("/audio/"))).toHaveLength(1);

    blobStore = true;
    const second = await pushDoc("exam", "ex1");
    expect(second.uploaded).toEqual(["1"]);
    // The record itself did not change, so it is not sent again.
    expect(calls.filter((c) => c.method === "PUT" && !c.url.includes("/audio/"))).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith("/audio/1"))).toHaveLength(2);
  });

  it("local-only fields never leave the browser", async () => {
    await localDocs.put("exam", "ex2", exam("ex2", { research: { secret: "s3cret", uploaded: [] } }), { updatedAt: 1500 });
    const calls = fakeFetch([]);
    await pushDoc("exam", "ex2");
    const sent = calls.find((c) => c.method === "PUT" && !c.url.includes("/audio/"))!.body as { data: Record<string, unknown> };
    expect(sent.data).not.toHaveProperty("research");
    expect(JSON.stringify(sent)).not.toContain("s3cret");
  });

  it("conflict adopts the server copy", async () => {
    await localDocs.put("exam", "ex3", exam("ex3", { research: { secret: "keep", uploaded: [] } }), { updatedAt: 1500 });
    const server = { kind: "exam", id: "ex3", updatedAt: 9000, data: exam("ex3", { actualGrade: "IH" }) };
    fakeFetch([(c) => (c.method === "PUT" && !c.url.includes("/audio/") ? Response.json({ error: "더 최근에 고친 기록이 있습니다.", kind: "conflict", doc: server }, { status: 409 }) : undefined)]);

    const state = await pushDoc("exam", "ex3");
    const local = await localDocs.get<ExamResult>("exam", "ex3");
    expect(local?.updatedAt).toBe(9000);
    expect(local?.data?.actualGrade).toBe("IH");
    expect(local?.data?.research?.secret).toBe("keep");
    expect(state.pushedVersion).toBe(9000);
    expect(state.error).toBeUndefined();
  });

  it("a server deletion that wins the conflict removes the local copy", async () => {
    await localDocs.put("exam", "ex4", exam("ex4"), { updatedAt: 1500 });
    fakeFetch([
      (c) =>
        c.method === "PUT" && !c.url.includes("/audio/")
          ? Response.json({ error: "더 최근에 고친 기록이 있습니다.", kind: "conflict", doc: { kind: "exam", id: "ex4", updatedAt: 9000, deletedAt: 9000, data: null } }, { status: 409 })
          : undefined,
    ]);
    await pushDoc("exam", "ex4");
    expect(await localDocs.list("exam")).toEqual([]);
    expect(await localDocs.list("exam", { withDeleted: true })).toEqual([]);
  });

  it("other failures are recorded, not thrown", async () => {
    await localDocs.put("exam", "ex5", exam("ex5"), { updatedAt: 1500 });
    fakeFetch([() => Response.json({ error: "잠시 후 다시 시도하세요." }, { status: 502 })]);
    const state = await pushDoc("exam", "ex5");
    expect(state.error).toBe("잠시 후 다시 시도하세요.");
    expect(state.pushedVersion).toBeUndefined();
  });
});

describe("fixes from review", () => {
  it("a doc the account lost is sent again with its recordings", async () => {
    await localDocs.put("exam", "lost01", exam("lost01"), { updatedAt: 1500 });
    await putAudio("lost01:1", new Blob(["sound"], { type: "audio/webm" }));
    await localDocs.setSync("exam", "lost01", { pushedVersion: 1500, uploaded: ["1"], syncedAt: 1 });
    const calls = fakeFetch([(c) => (c.url.startsWith("/api/me/docs?") ? Response.json({ docs: [] }) : undefined)]);
    const { push } = await syncKind("exam");
    expect(push).toEqual(["lost01"]);
    await pushDoc("exam", "lost01");
    expect(calls.filter((c) => c.method === "PUT" && !c.url.includes("/audio/"))).toHaveLength(1);
    expect(calls.filter((c) => c.url.endsWith("/lost01/audio/1"))).toHaveLength(1);
  });

  it("without a recording store, recordings are neither planned nor sent", async () => {
    await localDocs.put("exam", "nob01", exam("nob01"), { updatedAt: 1500 });
    await putAudio("nob01:1", new Blob(["sound"], { type: "audio/webm" }));
    await localDocs.setSync("exam", "nob01", { pushedVersion: 1500, uploaded: [] });
    const calls = fakeFetch([(c) => (c.url.startsWith("/api/me/docs?") ? Response.json({ docs: [{ id: "nob01", updatedAt: 1500, summary: {} }] }) : undefined)]);
    expect((await syncKind("exam", { audio: false })).push).toEqual([]);
    await pushDoc("exam", "nob01", { audio: false });
    expect(calls.filter((c) => c.url.includes("/audio/"))).toHaveLength(0);
  });

  it("an answer with no recording here does not stay pending", async () => {
    await localDocs.put("exam", "empty1", exam("empty1"), { updatedAt: 1500 });
    await putAudio("empty1:1", new Blob([]));
    fakeFetch([(c) => (c.url.startsWith("/api/me/docs?") ? Response.json({ docs: [{ id: "empty1", updatedAt: 1500, summary: {} }] }) : undefined)]);
    await pushDoc("exam", "empty1");
    expect((await syncKind("exam")).push).toEqual([]);
  });
});
