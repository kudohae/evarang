"use client";

import { useEffect, useState } from "react";
import { useOptionalConfig } from "@/components/AccessGate";
import type { Attempt } from "@/lib/domain/attempt";
import { collectAttempts } from "@/lib/domain/collect";
import type { Session } from "@/lib/domain/session";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { pullKind } from "@/lib/docs/sync";
import type { ExamResult } from "@/lib/exam/result";
import type { Level } from "@/lib/types";

export type StoryPracticeDoc = { practice?: Attempt[] };

type State = { attempts: Attempt[] | null; level: Level; pulling: boolean };

/**
 * Every attempt — mock tests, practice sessions, story practice — newest first, and the level practice
 * feedback should judge against (the latest mock test's final level, else 4). This browser's records come
 * at once; for a member who keeps records in the account, the ones made on other devices follow
 * (`pulling` until then).
 */
export function useAttempts(): State {
  const keep = syncEnabled(useOptionalConfig()?.user);
  const [state, setState] = useState<State>({ attempts: null, level: 4, pulling: keep });
  useEffect(() => {
    let live = true;
    const read = async () => {
      const [exams, sessions, stories] = await Promise.all([
        localDocs.list<ExamResult>("exam").catch(() => []),
        localDocs.list<Session>("session").catch(() => []),
        localDocs.list<StoryPracticeDoc>("story").catch(() => []),
      ]);
      return collectAttempts(
        exams.flatMap((d) => (d.data ? [d.data] : [])),
        sessions.flatMap((d) => (d.data ? [d.data] : [])),
        stories.flatMap((d) => (d.data ? [d.data] : [])),
      );
    };
    void (async () => {
      const here = await read();
      if (live) setState({ ...here, pulling: keep });
      if (!keep) return;
      const pulled = await Promise.all((["exam", "session", "story"] as const).map((k) => pullKind(k).catch(() => [])));
      const all = pulled.some((p) => p.length) ? await read() : here;
      if (live) setState({ ...all, pulling: false });
    })();
    return () => {
      live = false;
    };
  }, [keep]);
  return state;
}
