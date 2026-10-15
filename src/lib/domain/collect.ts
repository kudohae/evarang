import type { Attempt } from "@/lib/domain/attempt";
import { attemptsFromExam } from "@/lib/domain/from-exam";
import type { ExamResult } from "@/lib/exam/result";
import type { Level } from "@/lib/types";

/**
 * Every attempt from mock tests, practice sessions and story practice, newest first, and the level practice
 * feedback should judge against (the latest mock test's final level, else 4). A malformed record is skipped,
 * so one bad document never blanks every feature.
 */
export function collectAttempts(
  exams: ExamResult[],
  sessions: { attempts?: Attempt[] }[],
  stories: { practice?: Attempt[] }[],
): { attempts: Attempt[]; level: Level } {
  const safe = <T,>(f: () => T[]): T[] => {
    try {
      const out = f();
      return Array.isArray(out) ? out : [];
    } catch {
      return [];
    }
  };
  const attempts = [
    ...exams.flatMap((r) => safe(() => attemptsFromExam(r))),
    ...sessions.flatMap((s) => safe(() => s.attempts ?? [])),
    ...stories.flatMap((s) => safe(() => s.practice ?? [])),
  ]
    .filter((a) => a && typeof a.id === "string")
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const latest = exams.filter((r) => typeof r?.createdAt === "number" && r.finalLevel).sort((a, b) => b.createdAt - a.createdAt)[0];
  return { attempts, level: latest?.finalLevel ?? 4 };
}
