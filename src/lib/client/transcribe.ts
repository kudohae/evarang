"use client";

import { estimateWordTimes } from "@/lib/client/timing";
import type { FallbackReason, Transcript, TranscribeResponse } from "@/lib/types";

export type TranscribeResult = { transcript: Transcript; fallback?: FallbackReason };

export async function transcribeBlob(blob: Blob, durationMs: number): Promise<TranscribeResult> {
  if (!blob.size) return { transcript: { text: "", words: [], audioSeconds: 0 } };
  const res = await fetch("/api/transcribe", { method: "POST", body: blob, headers: { "content-type": blob.type || "audio/webm" } });
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
