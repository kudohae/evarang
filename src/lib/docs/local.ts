"use client";

import { transact } from "@/lib/client/db";
import type { Doc, DocKind, SyncState } from "@/lib/docs/kinds";
import type { ExamResult } from "@/lib/exam/result";

/*
  Documents kept in this browser. Mock tests stay where they always were (the `results` store) and are
  read as the "exam" kind; every other kind lives in `docs`. A deletion leaves a mark in `docs` for every
  kind, so the sync engine can pass it on to the account.
*/

const key = (kind: DocKind, id: string) => `${kind}:${id}`;
const range = (kind: DocKind) => IDBKeyRange.bound(`${kind}:`, `${kind}:￿`);

type LegacyExam = ExamResult & { updatedAt?: number };

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** How the old account sync told whether the account copy was current. */
function legacySignature(r: ExamResult): string {
  return [r.evaluations.length, r.actualGrade ?? "", r.answers.filter((a) => a.transcript).length, r.finalLevel].join("|");
}

function examDoc(r: LegacyExam): Doc<ExamResult> {
  return { kind: "exam", id: r.id, updatedAt: r.updatedAt ?? r.createdAt, data: r };
}

/**
 * Older records carry their account bookkeeping in the record itself. Move it to the sync store (unless sync
 * already knows the record) and drop the field. A copy whose signature still matched counts as pushed.
 */
function migrateLegacy(tx: IDBTransaction, records: LegacyExam[]): Promise<void>[] {
  return records
    .filter((r) => r.account)
    .map(async (r) => {
      const { account, ...rest } = r;
      const syncStore = tx.objectStore("sync");
      const existing = await req(syncStore.get(key("exam", r.id)));
      if (!existing && account) {
        const state: SyncState = {
          uploaded: account.uploaded.map(String),
          syncedAt: account.syncedAt,
          error: account.error,
          pushedVersion: account.signature && account.signature === legacySignature(r) ? r.createdAt : undefined,
        };
        syncStore.put(state, key("exam", r.id));
      }
      tx.objectStore("results").put(rest, r.id);
      delete (r as Partial<LegacyExam>).account;
    });
}

async function get<T>(kind: DocKind, id: string): Promise<Doc<T> | undefined> {
  if (kind !== "exam") return transact(["docs"], "readonly", (tx) => req(tx.objectStore("docs").get(key(kind, id))) as Promise<Doc<T> | undefined>);
  const found = await transact(["results", "docs", "sync"], "readwrite", async (tx) => {
    const r = (await req(tx.objectStore("results").get(id))) as LegacyExam | undefined;
    if (r) {
      await Promise.all(migrateLegacy(tx, [r]));
      return examDoc(r);
    }
    return (await req(tx.objectStore("docs").get(key(kind, id)))) as Doc<ExamResult> | undefined;
  });
  return (await found) as Doc<T> | undefined;
}

async function put<T>(kind: DocKind, id: string, data: T, opts: { updatedAt?: number } = {}): Promise<Doc<T>> {
  const updatedAt = opts.updatedAt ?? Date.now();
  await transact(["results", "docs"], "readwrite", (tx) => {
    if (kind === "exam") {
      tx.objectStore("results").put({ ...(data as object), updatedAt }, id);
      tx.objectStore("docs").delete(key(kind, id));
    } else {
      tx.objectStore("docs").put({ kind, id, updatedAt, data } satisfies Doc<T>, key(kind, id));
    }
  });
  return { kind, id, updatedAt, data };
}

/** Marks the document deleted; its data is gone, the mark stays until the account copy is gone too. */
async function remove(kind: DocKind, id: string, opts: { deletedAt?: number } = {}): Promise<void> {
  const at = opts.deletedAt ?? Date.now();
  await transact(["results", "docs"], "readwrite", (tx) => {
    if (kind === "exam") tx.objectStore("results").delete(id);
    tx.objectStore("docs").put({ kind, id, updatedAt: at, deletedAt: at, data: null } satisfies Doc, key(kind, id));
  });
}

/** Forgets a deletion mark, once the account copy is gone. */
async function forget(kind: DocKind, id: string): Promise<void> {
  await transact(["docs", "sync"], "readwrite", (tx) => {
    tx.objectStore("docs").delete(key(kind, id));
    tx.objectStore("sync").delete(key(kind, id));
  });
}

async function list<T = unknown>(kind: DocKind, opts: { withDeleted?: boolean } = {}): Promise<Doc<T>[]> {
  const out = await transact(["results", "docs", "sync"], kind === "exam" ? "readwrite" : "readonly", async (tx) => {
    const marked = (await req(tx.objectStore("docs").getAll(range(kind)))) as Doc[];
    let docs: Doc[] = marked;
    if (kind === "exam") {
      const records = (await req(tx.objectStore("results").getAll())) as LegacyExam[];
      await Promise.all(migrateLegacy(tx, records));
      docs = [...records.map(examDoc), ...marked.filter((m) => !records.some((r) => r.id === m.id))];
    }
    return opts.withDeleted ? docs : docs.filter((d) => !d.deletedAt);
  });
  return (await out) as Doc<T>[];
}

async function getSync(kind: DocKind, id: string): Promise<SyncState | undefined> {
  return transact(["sync"], "readonly", (tx) => req(tx.objectStore("sync").get(key(kind, id))) as Promise<SyncState | undefined>);
}

async function setSync(kind: DocKind, id: string, state: SyncState): Promise<void> {
  await transact(["sync"], "readwrite", (tx) => {
    tx.objectStore("sync").put(state, key(kind, id));
  });
}

/** Forgets every account copy's bookkeeping, e.g. after account storage is turned off. */
async function clearSync(): Promise<void> {
  await transact(["sync"], "readwrite", (tx) => {
    tx.objectStore("sync").clear();
  });
}

export const localDocs = { get, put, remove, forget, list, getSync, setSync, clearSync };
