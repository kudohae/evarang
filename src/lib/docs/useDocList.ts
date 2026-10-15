"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import type { RemoteSummary } from "@/lib/docs/account";
import type { Doc, DocKind } from "@/lib/docs/kinds";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { pushDoc, scheduleSync, syncKind } from "@/lib/docs/sync";

/**
 * The documents of one kind for a feature's screen: this browser's copies, plus the account's summaries for
 * members who keep records there (same rules as the home page's test list). `save` writes here and lets
 * the account copy follow.
 */
export function useDocList<T>(kind: DocKind) {
  const config = useConfig();
  const keep = syncEnabled(config.user);
  const audio = config.storage?.blob !== false;
  const [local, setLocal] = useState<Doc<T>[] | null>(null);
  const [remote, setRemote] = useState<RemoteSummary[]>([]);

  const reload = useCallback(
    () =>
      localDocs
        .list<T>(kind)
        .then((list) => setLocal(list.sort((a, b) => b.updatedAt - a.updatedAt)))
        .catch(() => setLocal([])),
    [kind],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const syncing = useRef(false);
  useEffect(() => {
    if (!keep) return setRemote([]);
    if (syncing.current) return;
    syncing.current = true;
    void (async () => {
      try {
        const { remote, push } = await syncKind(kind, { audio });
        setRemote(remote);
        await reload();
        for (const id of push) await pushDoc(kind, id, { audio });
      } catch {
        setRemote([]);
      } finally {
        syncing.current = false;
      }
    })();
  }, [keep, kind, audio, reload]);

  const save = useCallback(
    async (id: string, data: T) => {
      await localDocs.put(kind, id, data);
      if (keep) scheduleSync(kind, id, undefined, { audio });
      await reload();
    },
    [kind, keep, audio, reload],
  );

  /** Like `save`, but sends the account copy before returning — for a save followed by leaving the page. */
  const saveNow = useCallback(
    async (id: string, data: T) => {
      await localDocs.put(kind, id, data);
      if (keep) await pushDoc(kind, id, { audio });
      await reload();
    },
    [kind, keep, audio, reload],
  );

  const ids = new Set((local ?? []).map((d) => d.id));
  return { local, remote: remote.filter((r) => !ids.has(r.id)), save, saveNow, reload, keep };
}
