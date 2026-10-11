"use client";

import { useEffect, useRef } from "react";

export type OrbMode = "idle" | "speaking" | "listening";

/*
  The interviewer as light: a translucent sphere with a white-hot core and blue plasma
  that drifts and merges inside it, haloed by a soft bloom.
  Idle it glows faintly and breathes. Speaking it brightens and surges in syllable-like
  pulses. While you answer it follows the microphone and its light turns warm, the
  site's recording colour.
*/

type RGB = [number, number, number];

const COOL = { core: [244, 251, 255] as RGB, mid: [92, 214, 255] as RGB, deep: [44, 86, 214] as RGB, glow: [96, 160, 255] as RGB };
const WARM = { core: [255, 247, 240] as RGB, mid: [255, 168, 120] as RGB, deep: [196, 56, 36] as RGB, glow: [240, 120, 90] as RGB };

const HARMONICS = [
  { k: 2, speed: 0.5, weight: 0.1 },
  { k: 3, speed: 0.9, weight: 0.32 },
  { k: 4, speed: -1.2, weight: 0.24 },
  { k: 6, speed: 1.8, weight: 0.16 },
  { k: 8, speed: -2.4, weight: 0.1 },
];

// Plasma blobs inside the sphere: each orbits, wobbles and blends additively with the others.
const PLASMA = [
  { orbit: 0.42, speed: 0.42, size: 0.42, phase: 0.0, tint: 0.0 },
  { orbit: 0.46, speed: -0.33, size: 0.36, phase: 2.1, tint: 0.45 },
  { orbit: 0.34, speed: 0.58, size: 0.32, phase: 4.0, tint: 0.15 },
  { orbit: 0.5, speed: -0.5, size: 0.28, phase: 5.2, tint: 0.7 },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c: RGB, a: number) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${Math.max(0, Math.min(1, a))})`;

export function Orb({ mode, level = 0, size = 240 }: { mode: OrbMode; level?: number; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ mode, level });
  state.current = { mode, level };

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = size * dpr;
    el.height = size * dpr;
    ctx.scale(dpr, dpr);

    const c = size / 2;
    const R = size * 0.3;
    const rand = () => Math.random() * Math.PI * 2;
    const bodyPhases = HARMONICS.map(rand);
    const plasmaPhases = PLASMA.map(() => HARMONICS.map(rand));

    let amp = 0.015;
    let energy = 0.25;
    let warmth = 0;
    let pulse = 0;
    let pulseTarget = 0;
    let nextPulse = 0;
    let raf = 0;
    const start = performance.now();

    const blob = (cx: number, cy: number, r: number, a: number, t: number, ph: number[]) => {
      ctx.beginPath();
      const N = 96;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        let d = 0;
        HARMONICS.forEach((h, j) => (d += Math.sin(h.k * th + h.speed * t + ph[j]) * h.weight));
        const rr = r * (1 + a * d);
        const x = cx + Math.cos(th) * rr;
        const y = cy + Math.sin(th) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    const frame = (now: number) => {
      const t = ((now - start) / 1000) * (reduced ? 0.4 : 1);
      const { mode, level } = state.current;

      // Browser speech cannot be measured, so speaking is shaped as syllable-length surges.
      if (mode === "speaking" && now > nextPulse) {
        pulseTarget = 0.3 + Math.random() * 0.7;
        nextPulse = now + 90 + Math.random() * 140;
      }
      if (mode !== "speaking") pulseTarget = 0;
      pulse = lerp(pulse, pulseTarget, 0.2);

      const tAmp = mode === "speaking" ? 0.018 + pulse * 0.034 : mode === "listening" ? 0.012 + level * 0.05 : 0.01 + Math.sin(t * 1.2) * 0.004;
      const tEnergy = mode === "speaking" ? 0.6 + pulse * 0.4 : mode === "listening" ? 0.4 + level * 0.6 : 0.28 + Math.sin(t * 1.2) * 0.04;
      amp = lerp(amp, reduced ? tAmp * 0.5 : tAmp, 0.14);
      energy = lerp(energy, tEnergy, 0.1);
      warmth = lerp(warmth, mode === "listening" ? 1 : 0, 0.05);

      const col = {
        core: mix(COOL.core, WARM.core, warmth),
        mid: mix(COOL.mid, WARM.mid, warmth),
        deep: mix(COOL.deep, WARM.deep, warmth),
        glow: mix(COOL.glow, WARM.glow, warmth),
      };
      const scale = 1 + Math.sin(t * 1.1) * 0.015 + pulse * 0.05;
      const r = R * scale;

      ctx.clearRect(0, 0, size, size);

      // Bloom around the sphere.
      const bloom = ctx.createRadialGradient(c, c, r * 0.6, c, c, r * 1.65);
      bloom.addColorStop(0, rgba(col.glow, 0.28 + energy * 0.32));
      bloom.addColorStop(0.5, rgba(col.glow, 0.08 + energy * 0.12));
      bloom.addColorStop(1, rgba(col.glow, 0));
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, size, size);

      // Translucent body.
      ctx.save();
      blob(c, c, r, amp, t, bodyPhases);
      // Deep at the edge, clear in the middle: reads as a glass sphere holding light.
      const body = ctx.createRadialGradient(c - r * 0.15, c - r * 0.2, 0, c, c, r * 1.05);
      body.addColorStop(0, rgba(col.deep, 0.35 + energy * 0.15));
      body.addColorStop(0.75, rgba(col.deep, 0.7 + energy * 0.1));
      body.addColorStop(1, rgba(col.deep, 0.9));
      ctx.fillStyle = body;
      ctx.fill();
      ctx.clip();

      // Plasma, blended additively so overlapping blobs brighten into each other.
      ctx.globalCompositeOperation = "lighter";
      PLASMA.forEach((p, i) => {
        const a = p.phase + t * p.speed * (0.7 + energy * 0.9);
        const x = c + Math.cos(a) * r * p.orbit;
        const y = c + Math.sin(a * 1.27) * r * p.orbit;
        const pr = r * p.size * (0.9 + energy * 0.3);
        const g = ctx.createRadialGradient(x, y, 0, x, y, pr);
        const tint = mix(col.mid, col.core, p.tint);
        g.addColorStop(0, rgba(tint, 0.3 + energy * 0.35));
        g.addColorStop(1, rgba(tint, 0));
        ctx.fillStyle = g;
        blob(x, y, pr, 0.18 + energy * 0.2, t * (1.3 + i * 0.2), plasmaPhases[i]);
        ctx.fill();
      });

      // White-hot core.
      const coreR = r * (0.24 + energy * 0.1 + pulse * 0.05);
      const core = ctx.createRadialGradient(c, c, 0, c, c, coreR);
      core.addColorStop(0, rgba(col.core, 0.9));
      core.addColorStop(0.4, rgba(col.core, 0.35 + energy * 0.25));
      core.addColorStop(1, rgba(col.core, 0));
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, size, size);

      // Fresnel: light gathers toward the rim.
      const rim = ctx.createRadialGradient(c, c, r * 0.72, c, c, r * 1.02);
      rim.addColorStop(0, rgba(col.mid, 0));
      rim.addColorStop(1, rgba(col.mid, 0.35 + energy * 0.3));
      ctx.fillStyle = rim;
      ctx.fillRect(0, 0, size, size);

      // Specular glint.
      const glint = ctx.createRadialGradient(c - r * 0.42, c - r * 0.48, 0, c - r * 0.42, c - r * 0.48, r * 0.3);
      glint.addColorStop(0, rgba([255, 255, 255], 0.35));
      glint.addColorStop(1, rgba([255, 255, 255], 0));
      ctx.fillStyle = glint;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // Luminous rim.
      blob(c, c, r, amp, t, bodyPhases);
      ctx.strokeStyle = rgba(col.core, 0.35 + energy * 0.35);
      ctx.shadowColor = rgba(col.glow, 0.9);
      ctx.shadowBlur = 10 + energy * 14;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} style={{ width: size, height: size }} aria-hidden />;
}
