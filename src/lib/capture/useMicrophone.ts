"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { requestMic } from "@/lib/client/audio";

export type MicStatus = "idle" | "asking" | "ready" | "denied" | "error";

/** Asks for the microphone once and keeps the stream until `release()` or unmount. */
export function useMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MicStatus>("idle");
  const current = useRef<MediaStream | null>(null);

  const release = useCallback(() => {
    current.current?.getTracks().forEach((t) => t.stop());
    current.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  const request = useCallback(async (): Promise<MediaStream | null> => {
    if (current.current) return current.current;
    setStatus("asking");
    try {
      const s = await requestMic();
      current.current = s;
      setStream(s);
      setStatus("ready");
      return s;
    } catch (e) {
      setStatus((e as DOMException)?.name === "NotAllowedError" ? "denied" : "error");
      return null;
    }
  }, []);

  useEffect(() => () => current.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, status, request, release };
}
