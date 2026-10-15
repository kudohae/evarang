"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { requestMic } from "@/lib/client/audio";

export type MicStatus = "idle" | "asking" | "ready" | "denied" | "error";

type Mic = { stream: MediaStream | null; status: MicStatus; request(): Promise<MediaStream | null>; release(): void };

const MicContext = createContext<Mic | null>(null);

/**
 * One microphone stream for the whole site: asked for once, kept across pages, practice switches and steps.
 * When the browser already allows the site, it connects on its own after a reload.
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

  useEffect(() => {
    let cancelled = false;
    void navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((p) => {
        if (!cancelled && p.state === "granted") void request();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [request]);

  const value = useMemo(() => ({ stream, status, request, release }), [stream, status, request, release]);
  return <MicContext.Provider value={value}>{children}</MicContext.Provider>;
}

/** The shared microphone (see MicrophoneProvider). */
export function useMicrophone(): Mic {
  const mic = useContext(MicContext);
  if (!mic) throw new Error("useMicrophone outside MicrophoneProvider");
  return mic;
}
