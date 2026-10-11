"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Orb } from "@/components/exam/Orb";
import { Button, Icon, Spinner } from "@/components/ui";
import { Recorder, speak, useMicLevel, type Recording, type Speech } from "@/lib/client/audio";
import { formatClock } from "@/lib/metrics";

export const REPLAY_WINDOW_MS = 5000;

type Phase = "ready" | "playing" | "answering" | "saving";

/** The interviewer: an orb of light that ripples while she speaks and follows your voice while you answer. */
function Ava({ phase, level }: { phase: Phase; level: number }) {
  return <Orb mode={phase === "playing" ? "speaking" : phase === "answering" ? "listening" : "idle"} level={level} size={240} />;
}

export function QuestionStage({
  voice,
  stream,
  text,
  deadline,
  onDone,
}: {
  voice?: SpeechSynthesisVoice;
  stream: MediaStream;
  text: string;
  /** Epoch ms. When it passes, the current answer is submitted as is. */
  deadline?: number;
  onDone: (rec: Recording, replayed: boolean) => void;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [replayed, setReplayed] = useState(false);
  const [replayUntil, setReplayUntil] = useState(0);
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

  const play = useCallback(
    async (isReplay: boolean) => {
      setPhase("playing");
      const s = speak(text, voice);
      speech.current = s;
      await s.done;
      if (!alive.current) return;
      const r = new Recorder(stream);
      recorder.current = r;
      r.start();
      setStartedAt(Date.now());
      setReplayUntil(isReplay ? 0 : Date.now() + REPLAY_WINDOW_MS);
      setPhase("answering");
    },
    [stream, text, voice],
  );

  const replay = () => {
    if (phase !== "answering" || replayed || Date.now() > replayUntil) return;
    recorder.current?.discard();
    setReplayed(true);
    void play(true);
  };

  const submit = useCallback(async () => {
    setPhase("saving");
    speech.current?.cancel();
    const rec = recorder.current ? await recorder.current.stop() : { blob: new Blob([]), mimeType: "", durationMs: 0 };
    recorder.current = null;
    if (alive.current) onDone(rec, replayed);
  }, [onDone, replayed]);

  useEffect(() => {
    if (deadline && now >= deadline && phase !== "saving") void submit();
  }, [deadline, now, phase, submit]);

  const replayLeft = Math.min(REPLAY_WINDOW_MS / 1000, Math.max(0, Math.ceil((replayUntil - now) / 1000)));
  const canReplay = phase === "answering" && !replayed && replayLeft > 0;

  return (
    <div className="rise flex flex-1 flex-col items-center justify-center px-5 pb-16">
      <Ava phase={phase} level={level} />

      <p className="mt-10 h-6 text-center text-[15px] text-ink-2" aria-live="polite">
        {phase === "ready" && "재생 버튼을 누르면 질문이 나옵니다."}
        {phase === "playing" && "질문을 듣고 있습니다."}
        {phase === "answering" && (
          <span className="inline-flex items-center gap-2.5 text-ink">
            <span className="size-2 animate-pulse rounded-full bg-pen" />
            답변 녹음 중
            <span className="tabular text-ink-2">{formatClock((now - startedAt) / 1000)}</span>
          </span>
        )}
        {phase === "saving" && "답변을 저장하고 있습니다."}
      </p>

      <div className="mt-8 flex h-13 items-center gap-3">
        {phase === "ready" && (
          <Button size="lg" onClick={() => void play(false)}>
            <Icon name="play" className="size-4" />
            질문 듣기
          </Button>
        )}
        {(phase === "playing" || phase === "answering") && (
          <Button size="lg" variant="secondary" onClick={replay} disabled={!canReplay} className="min-w-[148px]">
            <Icon name="replay" className="size-4" />
            {canReplay ? <span className="tabular">다시 듣기 {replayLeft}</span> : replayed ? "다시 듣기 사용함" : "다시 듣기"}
          </Button>
        )}
        {(phase === "playing" || phase === "answering") && (
          <Button size="lg" onClick={() => void submit()} disabled={phase !== "answering"} className="min-w-[120px]">
            다음
            <Icon name="arrow" className="size-4" />
          </Button>
        )}
        {phase === "saving" && <Spinner className="size-5 text-ink-2" />}
      </div>

      <p className="mt-6 h-5 text-center text-[13px] text-ink-3">
        {phase === "answering" && canReplay && "질문이 끝난 뒤 5초 안에 한 번 다시 들을 수 있습니다."}
        {phase === "answering" && !canReplay && "답변을 마치면 다음을 누르세요."}
      </p>
    </div>
  );
}
