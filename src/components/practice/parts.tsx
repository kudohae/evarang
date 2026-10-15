"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, Spinner } from "@/components/ui";
import { topicById } from "@/lib/content/topics";
import type { Attempt } from "@/lib/domain/attempt";
import { useMicrophone } from "@/lib/capture/useMicrophone";
import type { AnswerRecord, ExamQuestion } from "@/lib/types";

/* Pieces every practice screen shares, so the four features look like one site. */

/** `back`: a BackButton shown above the title. */
export function PageHead({ title, lead, children, back }: { title: string; lead: ReactNode; children?: ReactNode; back?: ReactNode }) {
  return (
    <header className="rise pt-10 md:pt-14">
      {back && <div className="mb-6">{back}</div>}
      <h1 className="text-[30px] font-bold leading-[1.25] tracking-[-0.03em] md:text-[36px]">{title}</h1>
      <p className="mt-4 max-w-[600px] text-[16px] leading-[1.7] text-ink-2">{lead}</p>
      {children}
    </header>
  );
}

export function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-14 border-t border-line pt-8">
      <h2 className="flex items-baseline justify-between gap-4 text-[17px] font-semibold">
        {title}
        {aside && <span className="text-[13px] font-normal text-ink-3">{aside}</span>}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-[720px] px-5 pb-24">{children}</main>;
}

/**
 * The microphone, asked for on a click (browsers require one) and kept for the whole page.
 * `alt`: another way forward shown under the button (e.g. "마이크 없이 하기").
 */
export function MicGate({ children, alt }: { children: (stream: MediaStream) => ReactNode; alt?: ReactNode }) {
  const mic = useMicrophone();
  if (mic.stream) return <>{children(mic.stream)}</>;
  return (
    <div className="rounded-panel border border-line bg-surface px-6 py-8 text-center shadow-panel">
      <p className="text-[15px] leading-relaxed text-ink-2">답변을 녹음하려면 마이크가 필요합니다.</p>
      <div className="mt-5 flex justify-center">
        <Button onClick={() => void mic.request()} disabled={mic.status === "asking"}>
          {mic.status === "asking" ? <Spinner /> : "마이크 연결"}
        </Button>
      </div>
      {(mic.status === "denied" || mic.status === "error") && (
        <p role="alert" className="mt-4 text-[14px] text-pen-ink">
          마이크를 사용할 수 없습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용한 뒤 다시 시도하세요.
        </p>
      )}
      {alt && <div className="mt-4">{alt}</div>}
    </div>
  );
}

/** The report's question shape for an attempt, so QuestionDetail can show it. */
export function attemptQuestion(a: Attempt): ExamQuestion {
  return {
    number: a.question.number ?? 1,
    topicId: a.question.topicId ?? "",
    topicLabel: (a.question.topicId && topicById(a.question.topicId)?.label) || "연습",
    type: a.question.type,
    text: a.question.text,
    scored: true,
  };
}

export function attemptAnswer(a: Attempt): AnswerRecord | undefined {
  if (!a.recording) return undefined;
  return { number: a.question.number ?? 1, audioKey: a.recording.audioKey, mimeType: a.recording.mimeType, durationMs: a.recording.durationMs, replayed: false, transcript: a.transcript };
}

export function formatDay(at: number): string {
  return new Date(at).toLocaleDateString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** A row in a "지난 기록" list. */
export function HistoryRow({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li className="border-b border-line">
      <Link href={href} className="flex items-baseline justify-between gap-4 py-4 hover:text-ink">
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{title}</span>
        <span className="shrink-0 text-[13px] text-ink-3">{meta}</span>
      </Link>
    </li>
  );
}
