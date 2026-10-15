import { SKILL_IDS, type SkillGroup } from "@/lib/domain/skills";
import type { NoteCard } from "@/lib/notes/cards";
import type { ReviewState } from "@/lib/notes/review";

/*
  What the top of 첨삭노트 filters by: the mistake type (a skill group, one skill, or unclassified), the review
  status, and where the card came from.
*/

export type TypeFilter = "all" | "none" | `group:${SkillGroup}` | (typeof SKILL_IDS)[number];
export type NoteFilter = { type: TypeFilter; status: "due" | "all" | "learned" | "hidden"; source: "all" | "exam" | "practice" };

/** A card counts as learned from box 4 (a week or more between reviews). */
export const LEARNED_BOX = 4;

function typeMatches(c: NoteCard, type: TypeFilter): boolean {
  if (type === "all") return true;
  if (type === "none") return !c.skill;
  if (type.startsWith("group:")) return Boolean(c.skill?.startsWith(`${type.slice(6)}.`));
  return c.skill === type;
}

function isDue(c: NoteCard, state: ReviewState, now: number): boolean {
  const s = state[c.id];
  return !s || s.due <= now;
}

/** The cards to list, due ones first (longest waiting first), then newest. */
export function filterCards(cards: NoteCard[], state: ReviewState, f: NoteFilter, now: number): NoteCard[] {
  return cards
    .filter((c) => {
      const s = state[c.id];
      if (f.status === "hidden") {
        if (!s?.hidden) return false;
      } else if (s?.hidden) return false;
      if (f.status === "due" && !isDue(c, state, now)) return false;
      if (f.status === "learned" && (s?.box ?? 0) < LEARNED_BOX) return false;
      if (f.source !== "all" && !c.sources.includes(f.source)) return false;
      return typeMatches(c, f.type);
    })
    .sort((a, b) => Number(isDue(b, state, now)) - Number(isDue(a, state, now)) || (state[a.id]?.due ?? 0) - (state[b.id]?.due ?? 0) || b.createdAt - a.createdAt);
}

export type Counts = Record<string, { total: number; due: number }> & { learned: number; hidden: number };

/** Totals and due counts for every chip (all, none, each group, each skill); hidden cards are left out. */
export function countCards(cards: NoteCard[], state: ReviewState, now: number): Counts {
  const out = { learned: 0, hidden: 0 } as Counts;
  const add = (key: string, due: boolean) => {
    const v = (out[key] as { total: number; due: number } | undefined) ?? { total: 0, due: 0 };
    v.total++;
    if (due) v.due++;
    (out as Record<string, unknown>)[key] = v;
  };
  for (const c of cards) {
    const s = state[c.id];
    if (s?.hidden) {
      out.hidden++;
      continue;
    }
    const due = isDue(c, state, now);
    if ((s?.box ?? 0) >= LEARNED_BOX) out.learned++;
    add("all", due);
    if (c.skill) {
      add(`group:${c.skill.split(".")[0]}`, due);
      add(c.skill, due);
    } else add("none", due);
  }
  return out;
}
