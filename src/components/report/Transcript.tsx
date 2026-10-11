import type { ReactNode } from "react";
import type { QuestionFeedback } from "@/lib/evaluation/schema";
import { isFiller } from "@/lib/metrics";
import type { Transcript as T } from "@/lib/types";

type Range = { start: number; end: number; kind: "fix" | "up" | "filler"; n?: number; replacement?: string };

function locate(text: string, needle: string, taken: Range[]): [number, number] | null {
  const trimmed = needle.trim();
  if (!trimmed) return null;
  const free = (s: number, e: number) => taken.every((r) => e <= r.start || s >= r.end);
  for (const hay of [text, text.toLowerCase()]) {
    const n = hay === text ? trimmed : trimmed.toLowerCase();
    let from = 0;
    while (true) {
      const i = hay.indexOf(n, from);
      if (i < 0) break;
      if (free(i, i + n.length)) return [i, i + n.length];
      from = i + 1;
    }
  }
  return null;
}

/**
 * The answer as spoken, marked up like a graded paper:
 * corrections struck through with the fix in red, upgrade spots underlined,
 * fillers greyed, and silences of two seconds or more noted where they happened.
 */
export function AnnotatedTranscript({ transcript, feedback }: { transcript: T; feedback?: QuestionFeedback }) {
  const text = transcript.text;
  if (!text.trim()) return <p className="text-[15px] text-ink-3">녹음된 말이 없습니다.</p>;

  const ranges: Range[] = [];
  let n = 0;
  for (const c of feedback?.corrections ?? []) {
    n++;
    const at = locate(text, c.original, ranges);
    if (at) ranges.push({ start: at[0], end: at[1], kind: "fix", n, replacement: c.corrected });
  }
  for (const u of feedback?.upgrades ?? []) {
    n++;
    const at = locate(text, u.original, ranges);
    if (at) ranges.push({ start: at[0], end: at[1], kind: "up", n });
  }

  // Map each recognised word onto the text, for fillers and pauses.
  const pauses = new Map<number, number>();
  let cursor = 0;
  transcript.words.forEach((w, i) => {
    const at = text.indexOf(w.text, cursor);
    if (at < 0) return;
    cursor = at + w.text.length;
    if (isFiller(w.text)) {
      const end = at + w.text.replace(/[,.!?]+$/, "").length;
      if (ranges.every((r) => end <= r.start || at >= r.end)) ranges.push({ start: at, end, kind: "filler" });
    }
    if (i > 0) {
      const gap = w.start - transcript.words[i - 1].end;
      if (gap >= 2000) {
        const inside = ranges.find((r) => at > r.start && at < r.end);
        pauses.set(inside ? inside.start : at, gap / 1000);
      }
    }
  });

  ranges.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  const plain = (to: number) => {
    while (pos < to) {
      const nextPause = [...pauses.keys()].filter((p) => p >= pos && p < to).sort((a, b) => a - b)[0];
      const stop = nextPause ?? to;
      if (stop > pos) out.push(text.slice(pos, stop));
      if (nextPause !== undefined) {
        out.push(pauseMark(nextPause, pauses.get(nextPause)!));
        pauses.delete(nextPause);
      }
      pos = stop;
    }
  };
  const pauseMark = (key: number, sec: number) => (
    <span key={`p${key}`} className="tabular mx-0.5 whitespace-nowrap text-[13px] text-ink-3">
      ({sec.toFixed(1)}초)
    </span>
  );

  for (const r of ranges) {
    plain(r.start);
    if (pauses.has(r.start)) {
      out.push(pauseMark(r.start, pauses.get(r.start)!));
      pauses.delete(r.start);
    }
    const original = text.slice(r.start, r.end);
    if (r.kind === "filler") {
      out.push(
        <span key={r.start} className="text-ink-3">
          {original}
        </span>,
      );
    } else if (r.kind === "fix") {
      out.push(
        <span key={r.start}>
          <del className="text-ink-3 decoration-pen decoration-[1.5px]">{original}</del>{" "}
          <ins className="font-medium text-pen-ink no-underline">{r.replacement}</ins>
          <sup className="tabular ml-0.5 text-[11px] font-semibold text-pen-ink">{r.n}</sup>
        </span>,
      );
    } else {
      out.push(
        <span key={r.start}>
          <span className="underline decoration-ink-3 decoration-dotted decoration-[1.5px] underline-offset-[5px]">{original}</span>
          <sup className="tabular ml-0.5 text-[11px] font-semibold text-ink-2">{r.n}</sup>
        </span>,
      );
    }
    pos = r.end;
  }
  plain(text.length);

  return <p className="text-[16px] leading-[1.9] text-ink">{out}</p>;
}
