import type { AnswerRecord, TranscriptWord } from "@/lib/types";

const FILLERS = new Set(["um", "umm", "uh", "uhh", "uhm", "er", "erm", "ah", "ahh", "hmm", "hm", "mm", "mhm", "eh"]);
const LONG_PAUSE_MS = 2000;
const LOW_CONFIDENCE = 0.5;

export function normalizeWord(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

export function isFiller(w: string): boolean {
  return FILLERS.has(normalizeWord(w));
}

export type AnswerMetrics = {
  seconds: number;
  speechSeconds: number;
  words: number;
  fillers: number;
  fillersPerMin: number;
  wpm: number;
  longPauses: number;
  longestPause: number;
  startDelay: number;
  lowConfidence: string[];
};

export function answerMetrics(answer: AnswerRecord): AnswerMetrics | null {
  const t = answer.transcript;
  if (!t) return null;
  const words: TranscriptWord[] = t.words;
  const seconds = answer.durationMs / 1000;
  if (!words.length) {
    return { seconds, speechSeconds: 0, words: 0, fillers: 0, fillersPerMin: 0, wpm: 0, longPauses: 0, longestPause: 0, startDelay: seconds, lowConfidence: [] };
  }
  const speechMs = Math.max(1, words[words.length - 1].end - words[0].start);
  let fillers = 0;
  let real = 0;
  let longPauses = 0;
  let longest = 0;
  const low: string[] = [];
  words.forEach((w, i) => {
    if (isFiller(w.text)) fillers++;
    else {
      real++;
      if (w.confidence < LOW_CONFIDENCE) low.push(w.text.replace(/[.,!?]/g, ""));
    }
    if (i > 0) {
      const gap = w.start - words[i - 1].end;
      if (gap >= LONG_PAUSE_MS) longPauses++;
      longest = Math.max(longest, gap);
    }
  });
  const minutes = speechMs / 60000;
  return {
    seconds,
    speechSeconds: speechMs / 1000,
    words: real,
    fillers,
    fillersPerMin: fillers / minutes,
    wpm: real / minutes,
    longPauses,
    longestPause: longest / 1000,
    startDelay: words[0].start / 1000,
    lowConfidence: [...new Set(low)].slice(0, 12),
  };
}

export type ExamMetrics = {
  answered: number;
  totalSeconds: number;
  avgSeconds: number;
  avgWpm: number;
  fillersPerMin: number;
  longPauses: number;
};

export function examMetrics(list: (AnswerMetrics | null)[]): ExamMetrics {
  const m = list.filter((x): x is AnswerMetrics => Boolean(x && x.words > 0));
  const totalSeconds = m.reduce((s, x) => s + x.seconds, 0);
  const speech = m.reduce((s, x) => s + x.speechSeconds, 0);
  const words = m.reduce((s, x) => s + x.words, 0);
  const fillers = m.reduce((s, x) => s + x.fillers, 0);
  return {
    answered: m.length,
    totalSeconds,
    avgSeconds: m.length ? totalSeconds / m.length : 0,
    avgWpm: speech ? words / (speech / 60) : 0,
    fillersPerMin: speech ? fillers / (speech / 60) : 0,
    longPauses: m.reduce((s, x) => s + x.longPauses, 0),
  };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
