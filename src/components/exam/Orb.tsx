"use client";

import { useEffect, useRef } from "react";

export type OrbMode = "idle" | "speaking" | "listening";

/*
  The interviewer as a body of light: an ink sphere whose outline ripples and whose
  inner light drifts. Idle it breathes; speaking it surges in syllable-like pulses;
  while you answer it follows your microphone and the light warms to the pen red.
*/

// Mostly mid and high harmonics: the surface ripples while the whole stays round.
const HARMONICS = [
  { k: 2, speed: 0.4, weight: 0.12 },
  { k: 3, speed: 0.8, weight: 0.35 },
  { k: 4, speed: -1.1, weight: 0.25 },
  { k: 6, speed: 1.7, weight: 0.18 },
  { k: 9, speed: -2.6, weight: 0.1 },
];

const WISPS = [
  { orbit: 0.3, speed: 0.35, size: 0.42, phase: 0 },
  { orbit: 0.36, speed: -0.27, size: 0.36, phase: 2.1 },
  { orbit: 0.2, speed: 0.5, size: 0.32, phase: 4.2 },
];

// Streams of light inside the body, each a looser copy of the outline at a smaller radius.
const STREAMS = [0.38, 0.5, 0.62, 0.74, 0.86];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function Orb({ mode, level = 0, size = 220 }: { mode: OrbMode; level?: number; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ mode, level });
  state.current = { mode, level };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = size * dpr;
    el.height = size * dpr;
    ctx.scale(dpr, dpr);

    const c = size / 2;
    const R = size * 0.36;
    const phases = HARMONICS.map(() => Math.random() * Math.PI * 2);
    const streamPhases = STREAMS.map(() => HARMONICS.map(() => Math.random() * Math.PI * 2));
    let amp = 0.02;
    let energy = 0.3;
    let warmth = 0;
    let pulse = 0;
    let pulseTarget = 0;
    let nextPulse = 0;
    let raf = 0;
    const start = performance.now();

    const outline = (t: number, a: number, scale = 1, ph = phases) => {
      ctx.beginPath();
      const N = 120;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        let d = 0;
        HARMONICS.forEach((h, j) => (d += Math.sin(h.k * th + h.speed * t + ph[j]) * h.weight));
        const r = R * scale * (1 + a * d);
        const x = c + Math.cos(th) * r;
        const y = c + Math.sin(th) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const frame = (now: number) => {
      const t = ((now - start) / 1000) * (reduced ? 0.35 : 1);
      const { mode, level } = state.current;

      // Speech from the browser cannot be measured, so speaking is shaped as syllable-length surges.
      if (mode === "speaking" && now > nextPulse) {
        pulseTarget = 0.35 + Math.random() * 0.65;
        nextPulse = now + 90 + Math.random() * 130;
      }
      if (mode !== "speaking") pulseTarget = 0;
      pulse = lerp(pulse, pulseTarget, 0.22);

      const targetAmp = mode === "speaking" ? 0.02 + pulse * 0.04 : mode === "listening" ? 0.012 + level * 0.06 : 0.012 + Math.sin(t * 1.3) * 0.004;
      const targetEnergy = mode === "speaking" ? 0.55 + pulse * 0.45 : mode === "listening" ? 0.4 + level * 0.6 : 0.32;
      amp = lerp(amp, reduced ? targetAmp * 0.5 : targetAmp, 0.12);
      energy = lerp(energy, targetEnergy, 0.1);
      warmth = lerp(warmth, mode === "listening" ? 1 : 0, 0.05);
      const breathe = 1 + Math.sin(t * 1.1) * 0.012 + (mode === "speaking" ? pulse * 0.03 : 0);

      ctx.clearRect(0, 0, size, size);

      // Soft halo behind the sphere.
      const halo = ctx.createRadialGradient(c, c, R * 0.8, c, c, R * 1.45);
      halo.addColorStop(0, `rgba(23,23,26,${0.1 + energy * 0.1})`);
      halo.addColorStop(1, "rgba(23,23,26,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, size, size);

      // Body.
      ctx.save();
      outline(t, amp, breathe);
      const body = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R * 1.15);
      body.addColorStop(0, "#3b3a42");
      body.addColorStop(0.55, "#1f1f24");
      body.addColorStop(1, "#121215");
      ctx.fillStyle = body;
      ctx.fill();
      ctx.clip();

      // Inner light: drifting wisps, warm white at rest, pen red while recording.
      ctx.globalCompositeOperation = "screen";
      WISPS.forEach((w, i) => {
        const a = w.phase + t * w.speed * (1 + energy);
        const x = c + Math.cos(a) * R * w.orbit;
        const y = c + Math.sin(a * 1.3) * R * w.orbit;
        const rad = R * w.size * (0.85 + energy * 0.35 + Math.sin(t * 2 + i) * 0.05);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        const r = Math.round(lerp(255, 222, warmth));
        const gr = Math.round(lerp(244, 92, warmth));
        const b = Math.round(lerp(226, 66, warmth));
        g.addColorStop(0, `rgba(${r},${gr},${b},${0.1 + energy * 0.2})`);
        g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      });
      const lr = Math.round(lerp(255, 232, warmth));
      const lg = Math.round(lerp(240, 110, warmth));
      const lb = Math.round(lerp(220, 86, warmth));
      STREAMS.forEach((scale, i) => {
        outline(t * (1.2 + i * 0.25) * (0.6 + energy), 0.08 + energy * 0.14, scale * breathe, streamPhases[i]);
        ctx.strokeStyle = `rgba(${lr},${lg},${lb},${0.05 + energy * 0.16 * (1 - i * 0.12)})`;
        ctx.shadowColor = `rgba(${lr},${lg},${lb},${0.25 + energy * 0.35})`;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      });
      ctx.shadowBlur = 0;
      // Light gathered at the rim.
      outline(t, amp, breathe * 0.985);
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${0.08 + energy * 0.14})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      // Glossy highlight.
      const hl = ctx.createRadialGradient(c - R * 0.38, c - R * 0.45, 0, c - R * 0.38, c - R * 0.45, R * 0.55);
      hl.addColorStop(0, "rgba(255,255,255,0.22)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hl;
      ctx.fillRect(0, 0, size, size);
      ctx.restore();

      // A faint second skin that lags behind the body, which is what makes it read as fluid.
      outline(t - 0.25, amp * 1.4, breathe * 1.035);
      ctx.strokeStyle = warmth > 0.5 ? `rgba(207,59,38,${0.12 + energy * 0.2})` : `rgba(23,23,26,${0.06 + energy * 0.1})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden />;
}
