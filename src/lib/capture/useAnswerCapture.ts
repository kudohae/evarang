"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Recorder, speak, useMicLevel, type Recording, type Speech } from "@/lib/client/audio";
import { replayState, type CapturePolicy } from "@/lib/capture/policy";

export type CapturePhase = "ready" | "playing" | "answering" | "saving";

/**
 * One answer: play the question, record from when it ends, allow replays and retakes as the policy says,
 * and hand over the recording. `deadline` (epoch ms) submits the answer as it is once it passes.
 */
export function useAnswerCapture(o: {
  text: string;
  voice?: SpeechSynthesisVoice;
  stream: MediaStream;
  policy: CapturePolicy;
  deadline?: number;
  onRecorded(rec: Recording, meta: { replays: number }): void;
}) {
  const { text, voice, stream, policy, deadline, onRecorded } = o;
  const [phase, setPhase] = useState<CapturePhase>("ready");
  const [replays, setReplays] = useState(0);
  const [answeringSince, setAnsweringSince] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const speech = useRef<Speech | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const alive = useRef(true);
  const level = useMicLevel(stream, phase === "answering");

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      speech.current?.cancel();
      recorder.current?.discard();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const record = useCallback(() => {
    const r = new Recorder(stream);
    recorder.current = r;
    r.start();
    setStartedAt(Date.now());
  }, [stream]);

  const listen = useCallback(async () => {
    setPhase("playing");
    const s = speak(text, voice);
    speech.current = s;
    await s.done;
    if (!alive.current) return;
    record();
    setAnsweringSince(Date.now());
    setPhase("answering");
  }, [record, text, voice]);

  const replay = replayState(policy, { replays, answeringSince, now });
  const replayOffered = phase === "answering" && replay.allowed;

  const play = () => {
    if (phase === "ready") void listen();
  };

  /** Hear the question again; the answer so far is thrown away. */
  const replayNow = () => {
    if (!replayOffered || !replayState(policy, { replays, answeringSince, now: Date.now() }).allowed) return;
    recorder.current?.discard();
    recorder.current = null;
    setReplays((n) => n + 1);
    // After the one exam replay no window opens again; practice keeps offering it.
    void listen();
  };

  /** Throw away the answer so far and start recording again, without replaying the question. */
  const retry = () => {
    if (!policy.allowRetry || phase !== "answering") return;
    recorder.current?.discard();
    record();
  };

  const submit = useCallback(async () => {
    setPhase("saving");
    speech.current?.cancel();
    const rec = recorder.current ? await recorder.current.stop() : { blob: new Blob([]), mimeType: "", durationMs: 0 };
    recorder.current = null;
    if (alive.current) onRecorded(rec, { replays });
  }, [onRecorded, replays]);

  useEffect(() => {
    if (deadline && now >= deadline && phase !== "saving") void submit();
  }, [deadline, now, phase, submit]);

  return {
    phase,
    level,
    elapsedMs: phase === "answering" ? now - startedAt : 0,
    replays,
    replay: { allowed: replayOffered, secondsLeft: replay.secondsLeft },
    play,
    replayNow,
    submit: () => void submit(),
    retry,
  };
}

export type AnswerCapture = ReturnType<typeof useAnswerCapture>;
