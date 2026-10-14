"use client";

import { deleteAudio, getAudio, putAudio } from "@/lib/client/db";
import { accountDocs, type RemoteSummary } from "@/lib/docs/account";
import { KINDS, type Doc, type DocKind, type SyncState } from "@/lib/docs/kinds";
import { localDocs } from "@/lib/docs/local";
import { ApiError } from "@/lib/http";

/*
  Keeps a member's account copies following this browser (local-first). Callers decide whether sync is on
  (docs/policy.ts); nothing here checks consent.
  - push: a document whose local version is newer than the one last sent, or that the account lost.
  - deletions travel both ways as marks; a later edit beats an earlier deletion.
  - pull is lazy: lists carry summaries; a document is fetched when opened, a recording when played.
*/

type RemoteEntry = { id: string; updatedAt: number; deletedAt?: number };

export function planSync(local: Doc[], remote: RemoteEntry[], sync: Record<string, SyncState | undefined>): { push: string[]; dropLocal: string[] } {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const push: string[] = [];
  const dropLocal: string[] = [];
  for (const d of local) {
    const r = remoteById.get(d.id);
    const s = sync[d.id];
    if (d.deletedAt) {
      // Deleted here: tell the account, unless it has nothing or already knows.
      if (r && !r.deletedAt) push.push(d.id);
      else dropLocal.push(d.id);
    } else if (r?.deletedAt && d.updatedAt <= r.deletedAt) {
      dropLocal.push(d.id);
    } else if (!r || r.deletedAt || s?.pushedVersion === undefined || d.updatedAt > s.pushedVersion || pendingAudio(d, s)) {
      push.push(d.id);
    }
  }
  return { push, dropLocal };
}

function pendingAudio(d: Doc, s: SyncState | undefined): boolean {
  if (!d.data) return false;
  const uploaded = new Set(s?.uploaded ?? []);
  return KINDS[d.kind].audioKeys(d.data).some((k) => !uploaded.has(k));
}

function withoutLocalFields(kind: DocKind, data: unknown): unknown {
  const fields = KINDS[kind].localFields;
  if (!fields.length || !data || typeof data !== "object") return data;
  const copy = { ...(data as Record<string, unknown>) };
  for (const f of fields) delete copy[f];
  return copy;
}

function keepLocalFields(kind: DocKind, from: unknown, into: unknown): unknown {
  const fields = KINDS[kind].localFields;
  if (!fields.length || !from || !into || typeof into !== "object") return into;
  const copy = { ...(into as Record<string, unknown>) };
  for (const f of fields) if (f in (from as Record<string, unknown>)) copy[f] = (from as Record<string, unknown>)[f];
  return copy;
}

async function dropLocalCopy(kind: DocKind, id: string, data: unknown): Promise<void> {
  await localDocs.remove(kind, id);
  await localDocs.forget(kind, id);
  await Promise.all(KINDS[kind].audioKeys(data).map((k) => deleteAudio(`${id}:${k}`).catch(() => {})));
}

/** Takes the account's newer copy (or its deletion) in place of this browser's. */
async function adopt(kind: DocKind, local: Doc, server: Doc, state: SyncState): Promise<SyncState> {
  if (server.deletedAt || server.data === null) {
    await dropLocalCopy(kind, local.id, local.data);
    return { uploaded: [] };
  }
  await localDocs.put(kind, local.id, keepLocalFields(kind, local.data, server.data), { updatedAt: server.updatedAt });
  return { ...state, pushedVersion: server.updatedAt, syncedAt: Date.now() };
}

/** Sends one document and its missing recordings. Never throws; failures land in `error`. */
export async function pushDoc(kind: DocKind, id: string): Promise<SyncState> {
  const local = await localDocs.get(kind, id);
  const before = (await localDocs.getSync(kind, id)) ?? { uploaded: [] };
  if (!local) return before;
  let state: SyncState = { ...before, uploaded: [...before.uploaded], error: undefined };
  try {
    if (local.deletedAt) {
      await accountDocs.remove(kind, id);
      await localDocs.forget(kind, id);
      return { uploaded: [] };
    }
    if (state.pushedVersion !== local.updatedAt) {
      try {
        await accountDocs.put(kind, id, { updatedAt: local.updatedAt, data: withoutLocalFields(kind, local.data) });
        state.pushedVersion = local.updatedAt;
      } catch (e) {
        const server = e instanceof ApiError && e.kind === "conflict" ? (e.body as { doc?: Doc } | null)?.doc : undefined;
        if (!server) throw e;
        state = await adopt(kind, local, server, state);
        if (!state.pushedVersion) return state;
        await localDocs.setSync(kind, id, state);
        return state;
      }
    }
    for (const key of KINDS[kind].audioKeys(local.data)) {
      if (state.uploaded.includes(key)) continue;
      const blob = await getAudio(`${id}:${key}`).catch(() => undefined);
      // Nothing recorded, or the recording is only in the account already.
      if (!blob?.size) continue;
      try {
        await accountDocs.putAudio(kind, id, key, blob);
      } catch (e) {
        // No recording store on this server: the record is saved; the recordings wait for a later sync.
        if (e instanceof ApiError && e.status === 503) break;
        throw e;
      }
      state.uploaded.push(key);
    }
    state.syncedAt = Date.now();
  } catch (e) {
    state.error = (e as Error).message;
  }
  await localDocs.setSync(kind, id, state);
  return state;
}

/**
 * Compares this browser with the account: applies the account's deletions here and returns the account's
 * summaries (for lists) and the documents to push. The caller pushes them, so it can show progress.
 */
export async function syncKind(kind: DocKind): Promise<{ remote: RemoteSummary[]; push: string[] }> {
  const [remote, local] = await Promise.all([accountDocs.list(kind), localDocs.list(kind, { withDeleted: true })]);
  const sync: Record<string, SyncState | undefined> = {};
  await Promise.all(local.map(async (d) => (sync[d.id] = await localDocs.getSync(kind, d.id))));
  const plan = planSync(local, remote, sync);
  for (const id of plan.dropLocal) await dropLocalCopy(kind, id, local.find((d) => d.id === id)?.data);
  return { remote: remote.filter((r) => !r.deletedAt), push: plan.push };
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Pushes a document a second after its last save, so a burst of saves sends once. */
export function scheduleSync(kind: DocKind, id: string, onDone?: (s: SyncState) => void): void {
  const k = `${kind}:${id}`;
  clearTimeout(timers.get(k));
  timers.set(
    k,
    setTimeout(() => {
      timers.delete(k);
      void pushDoc(kind, id).then(onDone);
    }, 1000),
  );
}

/** This browser's copy, or the account's (kept here for next time). `account: false` skips the account. */
export async function loadDoc<T>(kind: DocKind, id: string, { account = true }: { account?: boolean } = {}): Promise<Doc<T> | null> {
  const local = await localDocs.get<T>(kind, id).catch(() => undefined);
  if (local && !local.deletedAt) return local;
  if (!account) return null;
  const remote = await accountDocs.get<T>(kind, id);
  if (!remote || remote.deletedAt || remote.data === null) return null;
  const { audio, ...doc } = remote;
  await localDocs.put(kind, id, doc.data, { updatedAt: doc.updatedAt });
  await localDocs.setSync(kind, id, { pushedVersion: doc.updatedAt, syncedAt: Date.now(), uploaded: audio });
  return { ...doc, kind, id };
}

/**
 * A mock-test recording by its local key ("<examId>:<n>"): this browser first, then the account,
 * keeping a fetched copy here for next time.
 */
export async function loadRecording(audioKey: string): Promise<Blob | undefined> {
  const local = await getAudio(audioKey).catch(() => undefined);
  if (local?.size) return local;
  const cut = audioKey.lastIndexOf(":");
  if (cut <= 0) return undefined;
  const blob = await accountDocs.getAudio("exam", audioKey.slice(0, cut), audioKey.slice(cut + 1));
  if (blob) await putAudio(audioKey, blob).catch(() => {});
  return blob;
}
