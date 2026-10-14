"use client";

import { useState } from "react";
import { Orb } from "@/components/exam/Orb";
import { Button, Icon, Spinner } from "@/components/ui";
import type { Recording } from "@/lib/client/audio";
import type { CapturePolicy } from "@/lib/capture/policy";
import { useAnswerCapture, type AnswerCapture, type CapturePhase } from "@/lib/capture/useAnswerCapture";
import { formatClock } from "@/lib/metrics";

/** The interviewer: an orb of light that ripples while she speaks and follows your voice while you answer. */
function Ava({ phase, level }: { phase: CapturePhase; level: number }) {
  return <Orb mode={phase === "playing" ? "speaking" : phase === "answering" ? "listening" : "idle"} level={level} size={240} />;
}

/** One question with its own capture state; remount (key) for the next question. */
export function AnswerStage({
  voice,
  stream,
  text,
  policy,
  deadline,
  onDone,
}: {
  voice?: SpeechSynthesisVoice;
  stream: MediaStream;
  text: string;
  policy: CapturePolicy;
  /** Epoch ms. When it passes, the current answer is submitted as is. */
  deadline?: number;
  onDone: (rec: Recording, replayed: boolean) => void;
}) {
  const capture = useAnswerCapture({ text, voice, stream, policy, deadline, onRecorded: (rec, meta) => onDone(rec, meta.replays > 0) });
  return <QuestionStage capture={capture} policy={policy} text={text} />;
}

/** Draws a capture: the orb, what is happening, and the buttons the policy allows. */
export function QuestionStage({ capture, policy, text }: { capture: AnswerCapture; policy: CapturePolicy; text: string }) {
  const { phase, level } = capture;
  const [showText, setShowText] = useState(false);
  const canReplay = capture.replay.allowed;
  const windowed = policy.replay.windowMs !== null;

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
            <span className="tabular text-ink-2">{formatClock(capture.elapsedMs / 1000)}</span>
          </span>
        )}
        {phase === "saving" && "답변을 저장하고 있습니다."}
      </p>

      <div className="mt-8 flex h-13 items-center gap-3">
        {phase === "ready" && (
          <Button size="lg" onClick={capture.play}>
            <Icon name="play" className="size-4" />
            질문 듣기
          </Button>
        )}
        {(phase === "playing" || phase === "answering") && (
          <Button size="lg" variant="secondary" onClick={capture.replayNow} disabled={!canReplay} className="min-w-[148px]">
            <Icon name="replay" className="size-4" />
            {canReplay && windowed ? (
              <span className="tabular">다시 듣기 {capture.replay.secondsLeft}</span>
            ) : !canReplay && windowed && capture.replays > 0 ? (
              "다시 듣기 사용함"
            ) : (
              "다시 듣기"
            )}
          </Button>
        )}
        {policy.allowRetry && phase === "answering" && (
          <Button size="lg" variant="quiet" onClick={capture.retry}>
            다시 말하기
          </Button>
        )}
        {(phase === "playing" || phase === "answering") && (
          <Button size="lg" onClick={capture.submit} disabled={phase !== "answering"} className="min-w-[120px]">
            다음
            <Icon name="arrow" className="size-4" />
          </Button>
        )}
        {phase === "saving" && <Spinner className="size-5 text-ink-2" />}
      </div>

      <p className="mt-6 h-5 text-center text-[13px] text-ink-3">
        {phase === "answering" && canReplay && windowed && "질문이 끝난 뒤 5초 안에 한 번 다시 들을 수 있습니다."}
        {phase === "answering" && !(canReplay && windowed) && "답변을 마치면 다음을 누르세요."}
      </p>

      {policy.showText && phase !== "ready" && (
        <div className="mt-4 max-w-[560px] text-center">
          {showText ? (
            <p className="text-[15px] leading-relaxed text-ink-2">{text}</p>
          ) : (
            <Button variant="quiet" onClick={() => setShowText(true)}>
              질문 보기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
