"use client";

import { putAudio } from "@/lib/client/db";
import { transcribeBlob, type TranscribeResult } from "@/lib/client/transcribe";
import type { Recording } from "@/lib/client/audio";

/**
 * Keeps the recording in this browser, then transcribes it (AssemblyAI, Gemini as fallback, word times
 * estimated when the fallback gives none). The server counts each recording once a day by its content.
 */
export async function keepAndTranscribe(rec: Recording, audioKey: string): Promise<TranscribeResult> {
  await putAudio(audioKey, rec.blob).catch(() => {});
  return transcribeBlob(rec.blob, rec.durationMs);
}
