"use client";

import { useEffect, useState } from "react";

// ── Question voice (browser speech synthesis) ─────────────

const PREFERRED = [/^Ava\b/i, /Jenny.*Natural|Aria.*Natural|Ava.*Natural/i, /Google US English/i, /Samantha/i, /Natural/i, /Online/i];

export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setVoices(speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en")));
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return voices;
}

export function defaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const us = voices.filter((v) => /en[-_]US/i.test(v.lang));
  for (const re of PREFERRED) {
    const hit = us.find((v) => re.test(v.name)) ?? voices.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  return us[0] ?? voices[0];
}

const VOICE_KEY = "evarang.voice";

export function savedVoiceName(): string | null {
  try {
    return localStorage.getItem(VOICE_KEY);
  } catch {
    return null;
  }
}

export function saveVoiceName(name: string) {
  try {
    localStorage.setItem(VOICE_KEY, name);
  } catch {}
}

export function resolveVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const name = savedVoiceName();
  return voices.find((v) => v.name === name) ?? defaultVoice(voices);
}

export type Speech = { done: Promise<void>; cancel: () => void };

/**
 * Speaks text sentence by sentence. Chrome silently stops long utterances,
 * so one utterance per sentence keeps long role-play prompts intact.
 */
let speechToken = 0;

export function speak(text: string, voice?: SpeechSynthesisVoice, rate = 0.95): Speech {
  if (typeof speechSynthesis === "undefined") return { done: Promise.resolve(), cancel: () => {} };
  // A new speech always replaces the old one; the old chain sees the token change and stops.
  const token = ++speechToken;
  speechSynthesis.cancel();
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  let cancelled = false;
  const done = new Promise<void>((resolve) => {
    let i = 0;
    let watchdog = 0;
    const next = () => {
      clearTimeout(watchdog);
      if (cancelled || token !== speechToken || i >= parts.length) return resolve();
      const sentence = parts[i++].trim();
      const u = new SpeechSynthesisUtterance(sentence);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-US";
      u.rate = rate;
      let finished = false;
      const once = () => {
        if (finished) return;
        finished = true;
        next();
      };
      u.onend = once;
      u.onerror = once;
      // Some engines never fire `end` (no voices installed, tab in background). Move on after a generous estimate.
      watchdog = window.setTimeout(once, 2500 + (sentence.length * 150) / rate);
      speechSynthesis.speak(u);
    };
    next();
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      if (token === speechToken) speechSynthesis.cancel();
    },
  };
}

// ── Recording ──────────────────────────────────────────────

export async function requestMic(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
}

function pickMime(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export type Recording = { blob: Blob; mimeType: string; durationMs: number };

export class Recorder {
  private rec: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startedAt = 0;

  constructor(private stream: MediaStream) {}

  get recording() {
    return this.rec?.state === "recording";
  }

  start() {
    const mimeType = pickMime();
    this.chunks = [];
    this.rec = new MediaRecorder(this.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 48000 });
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.rec.start(1000);
    this.startedAt = performance.now();
  }

  stop(): Promise<Recording> {
    const rec = this.rec;
    if (!rec || rec.state === "inactive") {
      return Promise.resolve({ blob: new Blob([]), mimeType: "", durationMs: 0 });
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        const mimeType = rec.mimeType || "audio/webm";
        resolve({ blob: new Blob(this.chunks, { type: mimeType }), mimeType, durationMs: performance.now() - this.startedAt });
      };
      rec.stop();
    });
  }

  discard() {
    if (this.rec && this.rec.state !== "inactive") {
      this.rec.onstop = null;
      this.rec.stop();
    }
    this.chunks = [];
  }
}

/** Input level 0..1, sampled every animation frame while `active`. */
export function useMicLevel(stream: MediaStream | null, active = true): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || !active) {
      setLevel(0);
      return;
    }
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      src.disconnect();
      void ctx.close();
    };
  }, [stream, active]);
  return level;
}
