"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useConfig } from "@/components/AccessGate";
import { AnswerStage } from "@/components/exam/QuestionStage";
import { attemptAnswer, attemptQuestion } from "@/components/practice/parts";
import { QuestionDetail } from "@/components/report/QuestionDetail";
import { Button, Spinner } from "@/components/ui";
import { PRACTICE_POLICY } from "@/lib/capture/policy";
import { keepAndTranscribe } from "@/lib/capture/pipeline";
import { resolveVoice, useVoices, type Recording } from "@/lib/client/audio";
import type { Attempt, AttemptSource } from "@/lib/domain/attempt";
import type { DocKind } from "@/lib/docs/kinds";
import type { LensId } from "@/lib/feedback/lenses";
import { requestFeedback } from "@/lib/feedback/request";
import type { ExamQuestion, Level } from "@/lib/types";

type Phase = { step: "answer" } | { step: "transcribing" } | { step: "feedback" } | { step: "done" } | { step: "error"; at: "transcribe" | "feedback"; message: string };

/**
 * One practice question end to end: answer (replays, retakes and the question text allowed), keep the
 * recording, transcribe, get feedback through `lens`, show it. Every stage saves the attempt through
 * `onAttempt`, so nothing is lost when feedback fails or a free limit is reached.
 */
export function PracticeRunner({
  docId,
  kind,
  number,
  source,
  question,
  lens,
  level,
  stream,
  onAttempt,
  header,
  after,
}: {
  docId: string;
  kind: DocKind;
  number: number;
  source: AttemptSource;
  question: ExamQuestion;
  lens: LensId;
  level: Level;
  stream: MediaStream;
  onAttempt: (a: Attempt) => Promise<void> | void;
  /** Shown above the result (e.g. the drill step's verdict). */
  header?: (a: Attempt) => ReactNode;
  /** Shown under the result (next actions). */
  after?: ReactNode;
}) {
  const config = useConfig();
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  const [phase, setPhase] = useState<Phase>({ step: "answer" });
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const recording = useRef<Recording | null>(null);
  const audioKey = `${docId}:${number}`;
  const available = config.models.filter((m) => m.available).map((m) => m.id);

  const save = async (a: Attempt) => {
    setAttempt(a);
    await onAttempt(a);
  };

  const getFeedback = async (a: Attempt) => {
    setPhase({ step: "feedback" });
    try {
      const answer = attemptAnswer(a)!;
      const { feedback, modelId } = await requestFeedback({ lens, attemptId: a.id, question: { ...question, number }, answer, level, available });
      await save({ ...a, feedback, modelId });
      setPhase({ step: "done" });
    } catch (e) {
      setPhase({ step: "error", at: "feedback", message: (e as Error).message });
    }
  };

  const transcribe = async (rec: Recording, base: Attempt) => {
    setPhase({ step: "transcribing" });
    try {
      const { transcript } = await keepAndTranscribe(rec, audioKey);
      const a = { ...base, transcript };
      await save(a);
      if (!transcript.text.trim()) return setPhase({ step: "error", at: "transcribe", message: "말한 내용이 들리지 않았습니다. 다시 답해 보세요." });
      await getFeedback(a);
    } catch (e) {
      setPhase({ step: "error", at: "transcribe", message: (e as Error).message });
    }
  };

  const onRecorded = (rec: Recording) => {
    recording.current = rec;
    const base: Attempt = {
      id: audioKey,
      sessionId: docId,
      source,
      createdAt: Date.now(),
      question: { text: question.text, type: question.type, topicId: question.topicId, number },
      recording: { audioKey, mimeType: rec.mimeType, durationMs: rec.durationMs },
    };
    void save(base).then(() => transcribe(rec, base));
  };

  if (phase.step === "answer") {
    return (
      <div className="flex min-h-[420px] flex-col rounded-panel border border-line bg-surface shadow-panel">
        <AnswerStage voice={voice} stream={stream} text={question.text} policy={PRACTICE_POLICY} onDone={onRecorded} />
      </div>
    );
  }

  if (phase.step === "transcribing" || phase.step === "feedback") {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-panel border border-line bg-surface shadow-panel" aria-live="polite">
        <Spinner className="size-5 text-ink-2" />
        <p className="text-[15px] text-ink-2">{phase.step === "transcribing" ? "답변을 받아쓰고 있습니다." : "피드백을 만들고 있습니다."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {phase.step === "error" && (
        <div className="rounded-panel border border-pen/30 bg-pen-soft px-5 py-4">
          <p role="alert" className="text-[15px] leading-relaxed text-pen-ink">
            {phase.message}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {phase.at === "feedback" && attempt && (
              <Button variant="secondary" onClick={() => void getFeedback(attempt)}>
                피드백 다시 받기
              </Button>
            )}
            {phase.at === "transcribe" && recording.current && attempt && (
              <Button variant="secondary" onClick={() => void transcribe(recording.current!, attempt)}>
                다시 받아쓰기
              </Button>
            )}
            <Button variant="quiet" onClick={() => setPhase({ step: "answer" })}>
              다시 답하기
            </Button>
          </div>
        </div>
      )}
      {attempt && phase.step === "done" && header?.(attempt)}
      {attempt && <QuestionDetail question={attemptQuestion(attempt)} answer={attemptAnswer(attempt)} feedback={attempt.feedback} kind={kind} showNumber={false} />}
      {phase.step === "done" && after}
    </div>
  );
}
