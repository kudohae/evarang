"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { requestMic } from "@/lib/client/audio";
import { createLease } from "@/lib/capture/lease";

export type MicStatus = "idle" | "asking" | "ready" | "denied" | "error";

type Mic = { stream: MediaStream | null; status: MicStatus; request(): Promise<MediaStream | null>; release(): void };
type Shared = Mic & { acquire(): () => void };

/** How long the microphone stays on after the last screen that records is left. */
export const MIC_IDLE_MS = 45_000;

const MicContext = createContext<Shared | null>(null);

/**
 * One microphone stream for the whole site, kept across pages, practice switches and steps while screens
 * that record are open, and let go MIC_IDLE_MS after the last one closes (the browser's recording light
 * goes off). When the browser already allows the site, a screen that records connects on its own.
 */
export function MicrophoneProvider({ children }: { children: ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");
  const current = useRef<MediaStream | null>(null);
  const pending = useRef<Promise<MediaStream | null> | null>(null);

  const release = useCallback(() => {
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const request = useCallback(async (): Promise<MediaStream | null> => {
    if (current.current) return current.current;
    if (pending.current) return pending.current;
    setStatus("asking");
    pending.current = (async () => {
      try {
        const s = await requestMic();
        current.current = s;
        // The device was unplugged or the browser revoked access: show the connect button again.
        for (const t of s.getAudioTracks()) t.addEventListener("ended", () => current.current === s && release());
        setStream(s);
        setStatus("ready");
        return s;
      } catch (e) {
        setStatus((e as DOMException)?.name === "NotAllowedError" ? "denied" : "error");
        return null;
      } finally {
        pending.current = null;
      }
    })();
    return pending.current;
  }, [release]);

  const [lease] = useState(() => createLease(() => release(), MIC_IDLE_MS));

  const acquire = useCallback(() => {
    const done = lease.acquire();
    if (!current.current && !pending.current) {
      void navigator.permissions
        ?.query({ name: "microphone" as PermissionName })
        .then((p) => {
          if (p.state === "granted" && lease.users() > 0) void request();
        })
        .catch(() => {});
    }
    return done;
  }, [lease, request]);

  // Leaving the site (or closing the tab) lets go at once.
  useEffect(() => () => current.current?.getTracks().forEach((t) => t.stop()), []);

  const value = useMemo(() => ({ stream, status, request, release, acquire }), [stream, status, request, release, acquire]);
  return <MicContext.Provider value={value}>{children}</MicContext.Provider>;
}

/** The shared microphone (see MicrophoneProvider). `use`: this screen records now, so keep it on. */
export function useMicrophone(use = true): Mic {
  const mic = useContext(MicContext);
  if (!mic) throw new Error("useMicrophone outside MicrophoneProvider");
  const { acquire } = mic;
  useEffect(() => (use ? acquire() : undefined), [use, acquire]);
  return mic;
}
