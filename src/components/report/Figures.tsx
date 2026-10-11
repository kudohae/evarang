"use client";

import { useEffect, useRef, useState } from "react";
import { GRADES, type Grade } from "@/lib/types";
import { formatClock } from "@/lib/metrics";

/** NL → AL on one line. The plausible range is a wash; the rating is the only solid mark. */
export function GradeLadder({ grade, low, high }: { grade: Grade; low: Grade; high: Grade }) {
  const at = (g: Grade) => GRADES.indexOf(g);
  const lo = Math.min(at(low), at(grade));
  const hi = Math.max(at(high), at(grade));
  const pct = (i: number) => (i / (GRADES.length - 1)) * 100;
  return (
    <div className="pt-2" role="img" aria-label={`예상 등급 ${grade}, 범위 ${low}–${high}`}>
      <div className="relative mx-3 h-8">
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-line-strong" />
        <div className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-ink/12" style={{ left: `${pct(lo)}%`, width: `${pct(hi) - pct(lo)}%` }} />
        {GRADES.map((g, i) => (
          <span
            key={g}
            className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              g === grade ? "size-4 bg-ink ring-4 ring-paper" : i >= lo && i <= hi ? "size-1.5 bg-ink-2" : "size-1.5 bg-line-strong"
            }`}
            style={{ left: `${pct(i)}%` }}
          />
        ))}
      </div>
      <div className="relative mx-3 mt-1 h-5">
        {GRADES.map((g, i) => (
          <span
            key={g}
            className={`tabular absolute -translate-x-1/2 whitespace-nowrap text-[12px] ${g === grade ? "font-semibold text-ink" : "text-ink-3"}`}
            style={{ left: `${pct(i)}%` }}
          >
            {g}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Five-step meter for a 1–5 rating. */
export function Meter({ value }: { value: number }) {
  const v = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <span className="inline-flex gap-1" role="img" aria-label={`5점 중 ${v}점`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-1.5 w-6 rounded-full ${i <= v ? "bg-ink" : "bg-line"}`} />
      ))}
    </span>
  );
}

const GUIDE_LOW = 60;
const GUIDE_HIGH = 120;

/**
 * Answer length per question as columns, with the commonly recommended
 * 1–2 minute band behind them. One series, so no legend; hover shows the value.
 */
export function LengthChart({ rows, onPick }: { rows: { number: number; seconds: number }[]; onPick?: (n: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw at the real pixel width so axis text stays 11px on phones instead of scaling down with the SVG.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 200;
  const pad = { l: 36, r: 8, t: 12, b: 26 };
  const maxSec = Math.max(150, ...rows.map((r) => r.seconds));
  const top = Math.ceil(maxSec / 30) * 30;
  const y = (s: number) => pad.t + (H - pad.t - pad.b) * (1 - s / top);
  const slot = (W - pad.l - pad.r) / Math.max(1, rows.length);
  const bw = Math.min(24, slot * 0.56);
  const ticks = Array.from({ length: Math.floor(top / 30) + 1 }, (_, i) => i * 30).filter((t) => t % 60 === 0 || top <= 150);
  const h = rows.find((r) => r.number === hover);

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block w-full" role="img" aria-label="문항별 답변 길이">
        <rect x={pad.l} y={y(GUIDE_HIGH)} width={W - pad.l - pad.r} height={y(GUIDE_LOW) - y(GUIDE_HIGH)} fill="var(--color-wash)" />
        <text x={W - pad.r - 4} y={y(GUIDE_HIGH) + 14} textAnchor="end" className="fill-ink-3 text-[11px]">
          권장 1~2분
        </text>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="tabular fill-ink-3 text-[11px]">
              {formatClock(t)}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(r.seconds);
          const base = y(0);
          const hgt = Math.max(0, base - top);
          const rad = Math.min(4, hgt);
          const x0 = cx - bw / 2;
          return (
            <g key={r.number}>
              <path
                d={`M${x0},${base} V${top + rad} Q${x0},${top} ${x0 + rad},${top} H${x0 + bw - rad} Q${x0 + bw},${top} ${x0 + bw},${top + rad} V${base} Z`}
                fill={hover === r.number ? "var(--color-ink)" : "var(--color-ink-2)"}
              />
              <text x={cx} y={H - 8} textAnchor="middle" className={`tabular text-[11px] ${hover === r.number ? "fill-ink" : "fill-ink-3"}`}>
                {r.number}
              </text>
              <rect
                x={pad.l + slot * i}
                y={pad.t}
                width={slot}
                height={H - pad.t}
                fill="transparent"
                className={onPick ? "cursor-pointer" : ""}
                onMouseEnter={() => setHover(r.number)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(r.number)}
              />
            </g>
          );
        })}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-ctl bg-ink px-2.5 py-1.5 text-[12px] text-paper"
          style={{
            left: `${((pad.l + slot * rows.indexOf(h) + slot / 2) / W) * 100}%`,
            top: `${(y(h.seconds) / H) * 100}%`,
            marginTop: -6,
          }}
        >
          <span className="tabular">
            {h.number}번 · {formatClock(h.seconds)}
          </span>
        </div>
      )}
    </div>
  );
}
