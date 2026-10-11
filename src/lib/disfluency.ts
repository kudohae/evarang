import { isFiller, normalizeWord } from "@/lib/metrics";
import type { TranscriptWord } from "@/lib/types";

export type Mark = "filler" | "repeat" | "cutoff" | null;

export type MarkedWord = { text: string; mark: Mark; pauseBefore: number | null };

const PAUSE_MS = 2000;

/**
 * Labels the hesitations in a verbatim transcript:
 * fillers, words said again straight away ("I I", "my mother my mother"),
 * words broken off mid-way ("wen- went"), and silences of two seconds or more.
 */
export function markDisfluencies(words: TranscriptWord[]): MarkedWord[] {
  const out: MarkedWord[] = words.map((w, i) => {
    const gap = i > 0 ? w.start - words[i - 1].end : 0;
    return { text: w.text, mark: null, pauseBefore: gap >= PAUSE_MS ? gap / 1000 : null };
  });
  const content: number[] = []; // indices of non-filler words, for repetition checks
  out.forEach((w, i) => {
    if (isFiller(w.text)) {
      w.mark = "filler";
      return;
    }
    if (/[-–—]$/.test(w.text)) w.mark = "cutoff";
    const n = normalizeWord(w.text);
    const prev = content[content.length - 1];
    if (n && prev !== undefined && normalizeWord(out[prev].text) === n) w.mark ??= "repeat";
    // Two-word repeat: "my mother my mother"
    if (content.length >= 3 && n) {
      const [a, b, c] = content.slice(-3).map((k) => normalizeWord(out[k].text));
      if (a === c && b === n && a !== b) {
        out[content[content.length - 1]].mark ??= "repeat";
        w.mark ??= "repeat";
      }
    }
    content.push(i);
  });
  return out;
}

export function countMarks(marked: MarkedWord[]) {
  return {
    fillers: marked.filter((m) => m.mark === "filler").length,
    repeats: marked.filter((m) => m.mark === "repeat" || m.mark === "cutoff").length,
    pauses: marked.filter((m) => m.pauseBefore !== null).length,
  };
}
