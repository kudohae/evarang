import type { Attempt } from "@/lib/domain/attempt";
import type { SkillId } from "@/lib/domain/skills";

/* Correction-note cards: every correction and upgrade the feedback ever gave, rebuilt from the attempts. */

export type NoteCard = {
  /** `${attemptId}:c${i}` for a correction, `${attemptId}:u${i}` for an upgrade. */
  id: string;
  attemptId: string;
  kind: "correction" | "upgrade";
  before: string;
  after: string;
  reason: string;
  skill?: SkillId;
  createdAt: number;
  question: string;
};

export function cardsFromAttempts(attempts: Attempt[]): NoteCard[] {
  return attempts.flatMap((a) => {
    const fb = a.feedback;
    if (!fb) return [];
    const base = { attemptId: a.id, createdAt: a.createdAt, question: a.question.text };
    return [
      ...(fb.corrections ?? []).map((c, i) => ({ ...base, id: `${a.id}:c${i}`, kind: "correction" as const, before: c.original, after: c.corrected, reason: c.reason, skill: c.skill })),
      ...(fb.upgrades ?? []).map((u, i) => ({ ...base, id: `${a.id}:u${i}`, kind: "upgrade" as const, before: u.original, after: u.better, reason: u.reason, skill: u.skill })),
    ];
  });
}
