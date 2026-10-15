"use client";

import { useEffect, useState } from "react";
import type { Attempt } from "@/lib/domain/attempt";
import { collectAttempts } from "@/lib/domain/collect";
import type { Session } from "@/lib/domain/session";
import { localDocs } from "@/lib/docs/local";
import type { ExamResult } from "@/lib/exam/result";
import type { Level } from "@/lib/types";

export type StoryPracticeDoc = { practice?: Attempt[] };

/**
 * Every attempt kept in this browser — mock tests, practice sessions, story practice — newest first,
 * and the level practice feedback should judge against (the latest mock test's final level, else 4).
 */
export function useAttempts(): { attempts: Attempt[] | null; level: Level } {
  const [state, setState] = useState<{ attempts: Attempt[] | null; level: Level }>({ attempts: null, level: 4 });
  useEffect(() => {
    void (async () => {
      const [exams, sessions, stories] = await Promise.all([
        localDocs.list<ExamResult>("exam").catch(() => []),
        localDocs.list<Session>("session").catch(() => []),
        localDocs.list<StoryPracticeDoc>("story").catch(() => []),
      ]);
      setState(
        collectAttempts(
          exams.flatMap((d) => (d.data ? [d.data] : [])),
          sessions.flatMap((d) => (d.data ? [d.data] : [])),
          stories.flatMap((d) => (d.data ? [d.data] : [])),
        ),
      );
    })();
  }, []);
  return state;
}
