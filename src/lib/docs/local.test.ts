import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { getResult } from "@/lib/client/db";
import { localDocs } from "@/lib/docs/local";
import type { ExamResult } from "@/lib/exam/result";

/** A browser that used the first version of the database: only `audio` and `results`. */
async function seedV1(records: Record<string, unknown>) {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.open("evarang", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("audio");
      req.result.createObjectStore("results");
    };
    req.onsuccess = () => {
      const tx = req.result.transaction("results", "readwrite");
      for (const [id, r] of Object.entries(records)) tx.objectStore("results").put(r, id);
      tx.oncomplete = () => {
        req.result.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

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
    answers: [],
    evaluations: [],
    ...extra,
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("localDocs", () => {
  it("exam docs read the results store", async () => {
    await seedV1({ old1: exam("old1") });
    const doc = await localDocs.get<ExamResult>("exam", "old1");
    expect(doc?.data?.id).toBe("old1");
    expect(doc?.updatedAt).toBe(1000);
    expect(doc?.kind).toBe("exam");
    expect((await localDocs.list("exam")).map((d) => d.id)).toEqual(["old1"]);

    await localDocs.put("exam", "old1", { ...doc!.data!, actualGrade: "IM2" }, { updatedAt: 3000 });
    const again = await localDocs.get<ExamResult>("exam", "old1");
    expect(again?.updatedAt).toBe(3000);
    expect(again?.data?.actualGrade).toBe("IM2");
  });

  it("legacy account bookkeeping moves to sync", async () => {
    await seedV1({ acc1: exam("acc1", { account: { uploaded: [1, 2], syncedAt: 5 } }) });
    expect((await localDocs.get<ExamResult>("exam", "acc1"))?.data).not.toHaveProperty("account");
    const sync = await localDocs.getSync("exam", "acc1");
    expect(sync?.uploaded).toEqual(["1", "2"]);
    expect(sync?.syncedAt).toBe(5);
    // Read straight from the store: the field is gone for good, not just hidden.
    expect(await getResult("acc1")).not.toHaveProperty("account");
  });

  it("a legacy copy that matched the account counts as pushed; a stale one does not", async () => {
    await seedV1({
      same: exam("same", { account: { uploaded: [], signature: "0||0|4", syncedAt: 5 } }),
      stale: exam("stale", { account: { uploaded: [], signature: "1||0|4", syncedAt: 5 } }),
    });
    await localDocs.list("exam");
    expect((await localDocs.getSync("exam", "same"))?.pushedVersion).toBe(1000);
    expect((await localDocs.getSync("exam", "stale"))?.pushedVersion).toBeUndefined();
  });

  it("remove leaves a tombstone", async () => {
    await localDocs.put("session", "s1", { hello: 1 });
    await localDocs.put("session", "s2", { hello: 2 });
    await localDocs.put("note", "n1", { hi: 1 });
    await localDocs.remove("session", "s1");
    const gone = await localDocs.get("session", "s1");
    expect(gone?.deletedAt).toBeTypeOf("number");
    expect(gone?.data).toBeNull();
    expect((await localDocs.list("session")).map((d) => d.id)).toEqual(["s2"]);
    expect((await localDocs.list("session", { withDeleted: true })).map((d) => d.id).sort()).toEqual(["s1", "s2"]);

    await localDocs.put("exam", "e1", exam("e1"));
    await localDocs.remove("exam", "e1");
    expect((await localDocs.get("exam", "e1"))?.data).toBeNull();
    expect(await localDocs.list("exam")).toEqual([]);
    expect((await localDocs.list("exam", { withDeleted: true })).map((d) => d.id)).toEqual(["e1"]);
  });

  it("clearSync forgets every sync record", async () => {
    await localDocs.setSync("exam", "x", { uploaded: ["1"], syncedAt: 1 });
    await localDocs.clearSync();
    expect(await localDocs.getSync("exam", "x")).toBeUndefined();
  });
});
