"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { AnnotatedTranscript } from "@/components/report/Transcript";
import { loadRecording } from "@/lib/client/account-records";
import { resolveVoice, speak, useVoices, type Speech } from "@/lib/client/audio";
import { TYPE_LABEL } from "@/lib/exam/compose";
import type { QuestionFeedback } from "@/lib/feedback/schema";
import { answerMetrics, formatClock } from "@/lib/metrics";
import type { AnswerRecord, ExamQuestion } from "@/lib/types";

function AudioPlayer({ audioKey, fallbackSeconds }: { audioKey: string; fallbackSeconds: number }) {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  // Chrome reports Infinity for MediaRecorder webm until fully played; fall back to the measured length.
  const [duration, setDuration] = useState(fallbackSeconds);
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let u = "";
    // Admin view passes "remote:<blob path>"; everyone else plays their own copy, from this browser or their account.
    const load = audioKey.startsWith("remote:")
      ? fetch(`/api/admin/audio?path=${encodeURIComponent(audioKey.slice(7))}`).then((r) => (r.ok ? r.blob() : undefined))
      : loadRecording(audioKey);
    void load.then((b) => {
      if (b && b.size) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [audioKey]);

  if (!url) return null;
  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={ref}
        src={url}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => Number.isFinite(e.currentTarget.duration) && setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={() => (playing ? ref.current?.pause() : void ref.current?.play())}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink transition-transform active:scale-95"
        aria-label={playing ? "일시정지" : "내 답변 듣기"}
      >
        <Icon name={playing ? "pause" : "play"} className="size-3.5" />
      </button>
      <div
        className="relative h-1 flex-1 cursor-pointer rounded-full bg-line"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (ref.current && duration) ref.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
        }}
      >
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular shrink-0 whitespace-nowrap text-right text-[13px] text-ink-2">
        {formatClock(time)} / {formatClock(duration)}
      </span>
    </div>
  );
}

function SpeakButton({ text }: { text: string }) {
  const voices = useVoices();
  const [on, setOn] = useState(false);
  const s = useRef<Speech | null>(null);
  useEffect(() => () => s.current?.cancel(), []);
  return (
    <button
      type="button"
      onClick={() => {
        if (on) {
          s.current?.cancel();
          setOn(false);
          return;
        }
        setOn(true);
        s.current = speak(text, resolveVoice(voices), 0.95);
        void s.current.done.then(() => setOn(false));
      }}
      className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
    >
      <Icon name={on ? "stop" : "speaker"} className="size-4" />
      {on ? "정지" : "들어보기"}
    </button>
  );
}

const TASK_TEXT = { full: "요구한 과제를 해냈습니다", partial: "과제를 일부만 해냈습니다", missed: "과제를 해내지 못했습니다" } as const;

function Label({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[13px] font-semibold text-ink-2">{children}</h4>;
}

export function QuestionDetail({ question, answer, feedback }: { question: ExamQuestion; answer?: AnswerRecord; feedback?: QuestionFeedback }) {
  const m = answer ? answerMetrics(answer) : null;
  const corrections = feedback?.corrections ?? [];
  const upgrades = feedback?.upgrades ?? [];

  return (
    <article className="rise">
      <p className="text-[13px] text-ink-3">
        {question.number}번 · {TYPE_LABEL[question.type]} · {question.topicLabel}
        {!question.scored && " · 채점 제외"}
      </p>
      <h3 className="mt-2 text-[18px] font-medium leading-[1.6] tracking-[-0.005em]" lang="en">
        {question.text}
      </h3>

      {answer && (
        <div className="mt-6">
          <AudioPlayer audioKey={answer.audioKey} fallbackSeconds={answer.durationMs / 1000} />
        </div>
      )}

      {m && (
        <p className="tabular mt-3 text-[13px] text-ink-2">
          {formatClock(m.seconds)} 답변 · 분당 {Math.round(m.wpm)}단어 · 군말 {m.fillers}회 · 2초 이상 멈춤 {m.longPauses}회
          {m.startDelay >= 3 && ` · 첫 마디까지 ${m.startDelay.toFixed(1)}초`}
          {answer?.transcript?.approxTiming && " · 멈춤·속도는 추정치"}
        </p>
      )}

      {feedback && (
        <div className="mt-8">
          <p className="text-[17px] font-semibold leading-[1.6]">{feedback.verdict}</p>
          <p className="mt-1 text-[14px] text-ink-2">이 답변만 보면 {feedback.performance} 수준입니다.</p>
        </div>
      )}

      <section className="mt-8 rounded-panel border border-line bg-surface shadow-panel px-5 py-5 md:px-7 md:py-6">
        <Label>내 답변</Label>
        <div className="mt-3" lang="en">
          {answer?.transcript ? (
            <AnnotatedTranscript transcript={answer.transcript} feedback={feedback} />
          ) : (
            <p className="text-[15px] text-ink-3">{answer?.transcriptError ?? "받아쓴 내용이 없습니다."}</p>
          )}
        </div>
        {m && m.lowConfidence.length > 0 && (
          <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-3">
            음성인식이 확신하지 못한 단어: <span lang="en">{m.lowConfidence.join(", ")}</span>. 발음, 작은 목소리, 잡음 중 하나가 원인일 수 있습니다. 발음 평가는 아닙니다.
          </p>
        )}
      </section>

      {feedback && (
        <>
          {corrections.length > 0 && (
            <section className="mt-10">
              <Label>고칠 곳</Label>
              <ol className="mt-3 flex flex-col">
                {corrections.map((c, i) => (
                  <li key={i} className="flex gap-4 border-t border-line py-4 first:border-t-0 first:pt-1">
                    <span className="tabular w-5 shrink-0 pt-0.5 text-[13px] font-semibold text-pen-ink">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[15px] leading-relaxed" lang="en">
                        <span className="text-ink-3 line-through decoration-pen">{c.original}</span>
                        <span className="mx-2 text-ink-3">→</span>
                        <span className="font-medium">{c.corrected}</span>
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{c.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {upgrades.length > 0 && (
            <section className="mt-10">
              <Label>더 나은 표현</Label>
              <ol className="mt-3 flex flex-col">
                {upgrades.map((u, i) => (
                  <li key={i} className="flex gap-4 border-t border-line py-4 first:border-t-0 first:pt-1">
                    <span className="tabular w-5 shrink-0 pt-0.5 text-[13px] font-semibold text-ink-2">{corrections.length + i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[15px] leading-relaxed" lang="en">
                        <span className="text-ink-2">{u.original}</span>
                        <span className="mx-2 text-ink-3">→</span>
                        <span className="font-medium">{u.better}</span>
                      </p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{u.reason}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <Label>과제 수행</Label>
              <p className="mt-2 text-[15px] font-medium">{TASK_TEXT[feedback.task.result]}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{feedback.task.comment}</p>
            </div>
            <div>
              <Label>구성</Label>
              <p className="mt-2 flex gap-4 text-[15px] font-medium">
                {(
                  [
                    ["도입", feedback.structure.opening],
                    ["전개", feedback.structure.development],
                    ["마무리", feedback.structure.closing],
                  ] as const
                ).map(([k, ok]) => (
                  <span key={k} className={ok ? "text-ink" : "text-ink-3 line-through decoration-pen"}>
                    {k}
                  </span>
                ))}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{feedback.structure.comment}</p>
            </div>
          </section>

          {feedback.strengths.length > 0 && (
            <section className="mt-10">
              <Label>잘한 점</Label>
              <ul className="mt-2 flex flex-col gap-1.5 text-[15px] leading-relaxed">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10 border-l-2 border-ink pl-5">
            <div className="flex items-center justify-between gap-4">
              <Label>한 단계 위로 다시 쓴 답변</Label>
              <SpeakButton text={feedback.model_answer} />
            </div>
            <p className="mt-3 text-[16px] leading-[1.85]" lang="en">
              {feedback.model_answer}
            </p>
          </section>
        </>
      )}
    </article>
  );
}
