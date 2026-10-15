import type { Attempt } from "@/lib/domain/attempt";
import type { SkillId } from "@/lib/domain/skills";
import type { ReviewState } from "@/lib/notes/review";

/* Correction-note cards: every correction and upgrade the feedback ever gave, rebuilt from the attempts. */

export type NoteCard = {
  /** `${attemptId}:c:${hash}` / `${attemptId}:u:${hash}` — from the text, so re-grading with the same fix keeps it. */
  id: string;
  /** The index-based id of the first version (`${attemptId}:c${i}`), for moving old review states. */
  legacyId: string;
  attemptId: string;
  kind: "correction" | "upgrade";
  source: "exam" | "practice";
  before: string;
  after: string;
  reason: string;
  skill?: SkillId;
  createdAt: number;
  question: string;
  /** How many answers made this same fix (after mergeDuplicates). */
  times?: number;
};

/** FNV-1a, base 36: short and stable. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function cardsFromAttempts(attempts: Attempt[]): NoteCard[] {
  return attempts.flatMap((a) => {
    const fb = a.feedback;
    if (!fb) return [];
    const base = { attemptId: a.id, createdAt: a.createdAt, question: a.question.text, source: a.source === "exam" ? ("exam" as const) : ("practice" as const) };
    const seen = new Set<string>();
    const id = (k: "c" | "u", before: string, after: string) => {
      let v = `${a.id}:${k}:${hash(`${before}\u0000${after}`)}`;
      while (seen.has(v)) v += "x";
      seen.add(v);
      return v;
    };
    return [
      ...(fb.corrections ?? []).map((c, i) => ({ ...base, id: id("c", c.original, c.corrected), legacyId: `${a.id}:c${i}`, kind: "correction" as const, before: c.original, after: c.corrected, reason: c.reason, skill: c.skill })),
      ...(fb.upgrades ?? []).map((u, i) => ({ ...base, id: id("u", u.original, u.better), legacyId: `${a.id}:u${i}`, kind: "upgrade" as const, before: u.original, after: u.better, reason: u.reason, skill: u.skill })),
    ];
  });
}

/** Review states saved under the first version's index ids, moved to the content ids. */
export function migrateState(state: ReviewState, cards: NoteCard[]): ReviewState {
  const out = { ...state };
  for (const c of cards) {
    if (out[c.legacyId] && !out[c.id]) out[c.id] = out[c.legacyId];
    if (c.legacyId !== c.id) delete out[c.legacyId];
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * The same fix given in several answers, as one card counted `times` and kept under its oldest id, so review
 * progress stays with it as new answers repeat the mistake.
 */
export function mergeDuplicates(cards: NoteCard[]): NoteCard[] {
  const byKey = new Map<string, NoteCard>();
  for (const c of [...cards].sort((a, b) => a.createdAt - b.createdAt)) {
    const key = `${c.kind}|${norm(c.before)}|${norm(c.after)}`;
    const seen = byKey.get(key);
    if (seen) seen.times = (seen.times ?? 1) + 1;
    else byKey.set(key, { ...c, times: 1 });
  }
  return [...byKey.values()];
}
