/*
  The kinds of document a member keeps. Shared by the browser store, the sync engine and the server,
  so this file must stay free of browser-only and server-only imports.
*/

export type DocKind = "exam" | "session" | "note" | "story";

export const DOC_KINDS: readonly DocKind[] = ["exam", "session", "note", "story"];

export type Doc<T = unknown> = { kind: DocKind; id: string; updatedAt: number; deletedAt?: number; data: T | null };

/** Local bookkeeping for one document's account copy. `pushedVersion` is the `updatedAt` last sent. */
export type SyncState = { pushedVersion?: number; syncedAt?: number; uploaded: string[]; error?: string };

type Kind = {
  maxBytes: number;
  /** Has recordings that go to Blob storage separately. */
  hasAudio: boolean;
  /** A small object for lists, so a list never loads whole documents. */
  summary(data: unknown): Record<string, unknown>;
};

type ExamLike = {
  createdAt?: number;
  startLevel?: number;
  finalLevel?: number;
  questions?: unknown[];
  evaluations?: { modelId?: string; overall?: { grade?: string } }[];
};

export const KINDS: Record<DocKind, Kind> = {
  exam: {
    maxBytes: 900_000,
    hasAudio: true,
    summary(data) {
      const r = (data ?? {}) as ExamLike;
      const latest = r.evaluations?.[r.evaluations.length - 1];
      return {
        createdAt: r.createdAt ?? null,
        startLevel: r.startLevel ?? null,
        finalLevel: r.finalLevel ?? null,
        questionCount: r.questions?.length ?? null,
        grade: latest?.overall?.grade ?? null,
        model: latest?.modelId ?? null,
      };
    },
  },
  session: {
    maxBytes: 900_000,
    hasAudio: true,
    summary(data) {
      const s = (data ?? {}) as { kind?: string; createdAt?: number; attempts?: unknown[] };
      return { kind: s.kind ?? null, createdAt: s.createdAt ?? null, attemptCount: s.attempts?.length ?? null };
    },
  },
  note: { maxBytes: 50_000, hasAudio: false, summary: () => ({}) },
  story: { maxBytes: 200_000, hasAudio: false, summary: () => ({}) },
};

export function isDocKind(k: string): k is DocKind {
  return (DOC_KINDS as readonly string[]).includes(k);
}
