"use client";

import { estimateWordTimes } from "@/lib/client/timing";
import type { FallbackReason, Transcript, TranscribeResponse } from "@/lib/types";

export type TranscribeResult = { transcript: Transcript; fallback?: FallbackReason };

/** `usageRef` names the recording for the usage ledger, so transcribing it again is not counted twice. */
export async function transcribeBlob(blob: Blob, durationMs: number, usageRef?: string): Promise<TranscribeResult> {
  if (!blob.size) return { transcript: { text: "", words: [], audioSeconds: 0 } };
  const headers: Record<string, string> = { "content-type": blob.type || "audio/webm" };
  if (usageRef) headers["x-usage-ref"] = usageRef;
  const res = await fetch("/api/transcribe", { method: "POST", body: blob, headers });
  const body = (await res.json().catch(() => ({}))) as TranscribeResponse & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `받아쓰기 실패 (${res.status})`);
  const { fallback, ...transcript } = body;
  if (transcript.approxTiming) {
    const est = await estimateWordTimes(blob, transcript.text, durationMs);
    transcript.words = est.words;
    transcript.audioSeconds = est.seconds;
  }
  return { transcript, fallback };
}
