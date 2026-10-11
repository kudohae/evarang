"use client";

import type { TranscriptWord } from "@/lib/types";

const FRAME_MS = 20;
// Gaps shorter than this are breaths between words, not pauses.
const BRIDGE_MS = 300;
const MIN_SEGMENT_MS = 120;

type Segment = { start: number; end: number };

/** Voiced stretches of the recording, found from frame loudness against the recording's own noise floor. */
async function voicedSegments(blob: Blob): Promise<{ segments: Segment[]; durationMs: number }> {
  const ctx = new AudioContext();
  try {
    const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
    const data = buf.getChannelData(0);
    const step = Math.max(1, Math.round((buf.sampleRate * FRAME_MS) / 1000));
    const rms: number[] = [];
    for (let i = 0; i < data.length; i += step) {
      let sum = 0;
      const end = Math.min(data.length, i + step);
      for (let j = i; j < end; j++) sum += data[j] * data[j];
      rms.push(Math.sqrt(sum / (end - i)));
    }
    const sorted = [...rms].sort((a, b) => a - b);
    const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
    const loud = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const threshold = floor + (loud - floor) * 0.18;

    const raw: Segment[] = [];
    let open: number | null = null;
    rms.forEach((v, i) => {
      const t = i * FRAME_MS;
      if (v > threshold && open === null) open = t;
      if (v <= threshold && open !== null) {
        raw.push({ start: open, end: t });
        open = null;
      }
    });
    if (open !== null) raw.push({ start: open, end: rms.length * FRAME_MS });

    const merged: Segment[] = [];
    for (const s of raw) {
      const last = merged[merged.length - 1];
      if (last && s.start - last.end < BRIDGE_MS) last.end = s.end;
      else merged.push({ ...s });
    }
    return { segments: merged.filter((s) => s.end - s.start >= MIN_SEGMENT_MS), durationMs: buf.duration * 1000 };
  } finally {
    void ctx.close();
  }
}

/**
 * Spreads the transcript's words over the voiced stretches in proportion to their length.
 * Pause positions and speaking rate come out close to the truth; per-word times do not.
 */
export async function estimateWordTimes(blob: Blob, text: string, fallbackMs: number): Promise<{ words: TranscriptWord[]; seconds: number }> {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { words: [], seconds: fallbackMs / 1000 };

  let segments: Segment[] = [];
  let durationMs = fallbackMs;
  try {
    ({ segments, durationMs } = await voicedSegments(blob));
  } catch {
    // Undecodable audio: assume steady speech across the recording.
  }
  if (!segments.length) segments = [{ start: Math.min(500, durationMs / 10), end: Math.max(1000, durationMs) }];

  const total = segments.reduce((s, x) => s + (x.end - x.start), 0);
  const words: TranscriptWord[] = [];
  let assigned = 0;
  segments.forEach((seg, si) => {
    const share = si === segments.length - 1 ? tokens.length - assigned : Math.round((tokens.length * (seg.end - seg.start)) / total);
    const count = Math.max(0, Math.min(share, tokens.length - assigned));
    const each = (seg.end - seg.start) / Math.max(1, count);
    for (let k = 0; k < count; k++) {
      const start = seg.start + k * each;
      words.push({ text: tokens[assigned + k], start: Math.round(start), end: Math.round(start + each * 0.85), confidence: 1 });
    }
    assigned += count;
  });
  return { words, seconds: durationMs / 1000 };
}
