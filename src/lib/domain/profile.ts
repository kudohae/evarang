import type { Attempt } from "@/lib/domain/attempt";
import type { SkillId } from "@/lib/domain/skills";
import { LENSES, type LensId } from "@/lib/feedback/lenses";

/*
  What a learner's answers say about them, across every feature: each skill tag counted over all attempts.
*/

export type SkillStat = { skill: SkillId; weak: number; strong: number; lastSeen: number };

/** Weakest first: most weak marks, then fewest strong ones, then most recent. */
export function skillProfile(attempts: Attempt[]): SkillStat[] {
  const stats = new Map<SkillId, SkillStat>();
  for (const a of attempts) {
    for (const mark of a.feedback?.skills ?? []) {
      const s = stats.get(mark.skill) ?? { skill: mark.skill, weak: 0, strong: 0, lastSeen: 0 };
      if (mark.verdict === "weak") s.weak++;
      else s.strong++;
      s.lastSeen = Math.max(s.lastSeen, a.createdAt);
      stats.set(mark.skill, s);
    }
  }
  return [...stats.values()].sort((a, b) => b.weak - a.weak || a.strong - b.strong || b.lastSeen - a.lastSeen);
}

/** A question-type lens that watches this skill, for "practice this" buttons. */
export function suggestLens(skill: SkillId): LensId {
  const typeLenses = Object.values(LENSES).filter((l) => l.id.startsWith("type.") && l.id !== "type.intro");
  // Prefer the lens where the skill comes earliest in its focus list.
  const ranked = typeLenses
    .map((l) => ({ id: l.id, at: l.focus.indexOf(skill) }))
    .filter((l) => l.at >= 0)
    .sort((a, b) => a.at - b.at);
  return ranked[0]?.id ?? "type.describe";
}
