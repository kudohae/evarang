"use client";

import { putAudio } from "@/lib/client/db";
import { transcribeBlob, type TranscribeResult } from "@/lib/client/transcribe";
import type { Recording } from "@/lib/client/audio";

/**
 * Keeps the recording in this browser, then transcribes it (AssemblyAI, Gemini as fallback, word times
 * estimated when the fallback gives none). The usage ledger counts the recording once per day by `usageRef`.
 */
export async function keepAndTranscribe(rec: Recording, audioKey: string, opts: { usageRef?: string } = {}): Promise<TranscribeResult> {
  await putAudio(audioKey, rec.blob).catch(() => {});
  return transcribeBlob(rec.blob, rec.durationMs, opts.usageRef ?? audioKey);
}
