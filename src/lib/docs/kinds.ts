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
  /** Keys of the recordings the document refers to; the local copy is the audio entry `${id}:${key}`. */
  audioKeys(data: unknown): string[];
  /** Fields that stay in this browser and never go to the account. */
  localFields: string[];
};

type ExamLike = {
  createdAt?: number;
  startLevel?: number;
  finalLevel?: number;
  questions?: unknown[];
  evaluations?: { modelId?: string; overall?: { grade?: string } }[];
};

/** Recording keys of attempts: their audioKey is `${docId}:${key}`. */
function recordingKeys(attempts: unknown[] | undefined): string[] {
  return (attempts ?? []).flatMap((a) => {
    const key = (a as { recording?: { audioKey?: string } })?.recording?.audioKey;
    return key ? [key.slice(key.lastIndexOf(":") + 1)] : [];
  });
}

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
    audioKeys: (data) => ((data as { answers?: { number: number }[] } | null)?.answers ?? []).map((a) => String(a.number)),
    // The research copy's secret proves ownership of the research record; it never leaves this browser.
    localFields: ["research"],
  },
  session: {
    maxBytes: 900_000,
    hasAudio: true,
    summary(data) {
      const s = (data ?? {}) as { kind?: string; title?: string; createdAt?: number; attempts?: unknown[] };
      return { kind: s.kind ?? null, title: s.title ?? null, createdAt: s.createdAt ?? null, attemptCount: s.attempts?.length ?? null };
    },
    audioKeys: (data) => recordingKeys((data as { attempts?: unknown[] } | null)?.attempts),
    localFields: [],
  },
  // One review-state document; cards are rebuilt from the attempts. ~2,000 cards fit.
  note: { maxBytes: 200_000, hasAudio: false, summary: () => ({}), audioKeys: () => [], localFields: [] },
  story: {
    maxBytes: 200_000,
    hasAudio: true,
    summary(data) {
      const s = (data ?? {}) as { title?: string; createdAt?: number };
      return { title: s.title ?? null, createdAt: s.createdAt ?? null };
    },
    audioKeys: (data) => recordingKeys((data as { practice?: unknown[] } | null)?.practice),
    localFields: [],
  },
};

export function isDocKind(k: string): k is DocKind {
  return (DOC_KINDS as readonly string[]).includes(k);
}
