import type { Attempt } from "@/lib/domain/attempt";
import type { SkillId } from "@/lib/domain/skills";
import type { ReviewState } from "@/lib/notes/review";

/* Correction-note cards: every correction and upgrade the feedback ever gave, rebuilt from the attempts. */

export type NoteSource = "exam" | "practice";

export type NoteCard = {
  /**
   * `c:${hash}` / `u:${hash}` of the fix itself (normalized before → after): the same in every answer, after
   * re-grading and on every device, so review progress stays with the fix.
   */
  id: string;
  /** Ids earlier versions stored review state under (`${attemptId}:c${i}`, `${attemptId}:c:${hash}`). */
  oldIds: string[];
  attemptId: string;
  kind: "correction" | "upgrade";
  /** Where this fix was given; a merged card lists every source. */
  sources: NoteSource[];
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

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function cardsFromAttempts(attempts: Attempt[]): NoteCard[] {
  return attempts.flatMap((a) => {
    const fb = a.feedback;
    if (!fb) return [];
    const base = { attemptId: a.id, createdAt: a.createdAt, question: a.question.text, sources: [a.source === "exam" ? "exam" : "practice"] as NoteSource[] };
    const make = (k: "c" | "u", i: number, before: string, after: string) => ({
      id: `${k}:${hash(`${norm(before)}\u0000${norm(after)}`)}`,
      oldIds: [`${a.id}:${k}${i}`, `${a.id}:${k}:${hash(`${before}\u0000${after}`)}`],
    });
    return [
      ...(fb.corrections ?? []).map((c, i) => ({ ...base, ...make("c", i, c.original, c.corrected), kind: "correction" as const, before: c.original, after: c.corrected, reason: c.reason, skill: c.skill })),
      ...(fb.upgrades ?? []).map((u, i) => ({ ...base, ...make("u", i, u.original, u.better), kind: "upgrade" as const, before: u.original, after: u.better, reason: u.reason, skill: u.skill })),
    ];
  });
}

/** The same fix given in several answers, as one card counted `times`, shown as first given. */
export function mergeDuplicates(cards: NoteCard[]): NoteCard[] {
  const byId = new Map<string, NoteCard>();
  for (const c of [...cards].sort((a, b) => a.createdAt - b.createdAt)) {
    const seen = byId.get(c.id);
    if (!seen) {
      byId.set(c.id, { ...c, times: 1, sources: [...c.sources], oldIds: [...c.oldIds] });
      continue;
    }
    seen.times = (seen.times ?? 1) + 1;
    for (const s of c.sources) if (!seen.sources.includes(s)) seen.sources.push(s);
    seen.oldIds.push(...c.oldIds);
  }
  return [...byId.values()];
}

/** Review states saved under older ids, moved to the fix's id; when several existed, the most-reviewed wins. */
export function migrateState(state: ReviewState, cards: NoteCard[]): ReviewState {
  const out = { ...state };
  for (const c of cards) {
    const candidates = [c.id, ...c.oldIds].map((k) => out[k]).filter(Boolean);
    const best = candidates.sort((a, b) => b.reviews - a.reviews || b.due - a.due)[0];
    for (const k of c.oldIds) delete out[k];
    if (best) out[c.id] = best;
  }
  return out;
}
