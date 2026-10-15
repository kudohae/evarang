"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { Block, formatDay, HistoryRow, MicGate, Page, PageHead } from "@/components/practice/parts";
import { Button } from "@/components/ui";
import type { Attempt } from "@/lib/domain/attempt";
import type { Session } from "@/lib/domain/session";
import { skillById } from "@/lib/domain/skills";
import { useAttempts } from "@/lib/domain/useAttempts";
import { localDocs } from "@/lib/docs/local";
import { useDocList } from "@/lib/docs/useDocList";
import { recordAttempt } from "@/lib/practice/record";
import { newId } from "@/lib/exam/result";
import { practiceQuestion } from "@/lib/practice/questions";
import { passedSteps, STEPS, stepVerdict, type Step } from "@/lib/practice/structure";
import type { ExamQuestion } from "@/lib/types";

const VERDICT = {
  strong: { label: "잘했습니다", tone: "border-good/40 bg-surface text-good" },
  weak: { label: "아직 부족합니다", tone: "border-pen/40 bg-pen-soft text-pen-ink" },
  unclear: { label: "판단하기 어려웠습니다", tone: "border-line bg-surface text-ink-2" },
} as const;

function StepGuide({ step }: { step: Step }) {
  return (
    <div className="rounded-panel border border-line bg-surface px-6 py-5 shadow-panel">
      <p className="text-[15px] leading-[1.75] text-ink-2">{step.explain}</p>
      <p className="mt-4 text-[13px] font-semibold text-ink-3">쓸 만한 틀</p>
      <ul className="mt-2 flex flex-col gap-1.5" lang="en">
        {step.frames.map((f) => (
          <li key={f} className="text-[15px] text-ink">
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Verdict({ step, attempt }: { step: Step; attempt: Attempt }) {
  return (
    <div className="flex flex-col gap-2">
      {stepVerdict(step, attempt.feedback).map((v) => (
        <div key={v.skill} className={`flex items-center justify-between gap-4 rounded-panel border px-5 py-4 ${VERDICT[v.verdict].tone}`}>
          <span className="text-[16px] font-semibold text-ink">{skillById(v.skill)?.label}</span>
          <span className="text-[15px] font-semibold">{VERDICT[v.verdict].label}</span>
        </div>
      ))}
    </div>
  );
}

/** 문장 구조화 연습: one part of the answer's skeleton at a time. */
export function StructureApp() {
  const { level } = useAttempts();
  const docs = useDocList<Session>("session");
  const [step, setStep] = useState<Step | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [number, setNumber] = useState(1);
  // The latest copy, for saves that finish after newer ones started (transcript, then feedback).
  const latest = useRef<Session | null>(null);

  const mine = useMemo(() => (docs.local ?? []).flatMap((d) => (d.data?.kind === "structure" ? [d.data] : [])), [docs.local]);
  const passed = useMemo(() => passedSteps(mine), [mine]);

  const ask = (s: Step, avoid?: string) => practiceQuestion({ type: s.types[Math.floor(Math.random() * s.types.length)], avoid });

  const start = (s: Step) => {
    setStep(s);
    latest.current = { id: newId(), kind: "structure", createdAt: Date.now(), title: `구조화 · ${s.title}`, settings: { step: s.id }, attempts: [] };
    setSession(latest.current);
    setQuestion(ask(s));
    setNumber(1);
    window.scrollTo({ top: 0 });
  };

  // A late save from an earlier session (feedback arriving after the learner moved on) goes to that session.
  const record = async (a: Attempt) => {
    const open = await recordAttempt(latest.current, a, {
      get: async (id) => (await localDocs.get<Session>("session", id).catch(() => undefined))?.data ?? null,
      save: (s) => docs.save(s.id, s),
    });
    if (open && open.id === a.sessionId && latest.current?.id === open.id) {
      latest.current = open;
      setSession(open);
    }
  };

  if (step && session && question) {
    const nextStep = STEPS[STEPS.indexOf(step) + 1];
    return (
      <AppShell>
        <Page>
          <PageHead title={step.title} lead={`${STEPS.indexOf(step) + 1}단계 / ${STEPS.length}단계. 이 단계에만 집중해서 답하세요. 나머지는 짧게 봅니다.`}>
            <button type="button" onClick={() => (setStep(null), setSession(null), setQuestion(null))} className="mt-4 text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
              단계 고르기
            </button>
          </PageHead>
          <div className="mt-10 flex flex-col gap-8">
            <StepGuide step={step} />
            <MicGate>
              {(stream) => (
                <PracticeRunner
                  key={`${session.id}:${number}`}
                  docId={session.id}
                  kind="session"
                  number={number}
                  source="structure"
                  question={question}
                  lens={step.lens}
                  level={level}
                  stream={stream}
                  onAttempt={record}
                  header={(a) => <Verdict step={step} attempt={a} />}
                  after={
                    <div className="flex flex-wrap gap-2 border-t border-line pt-6">
                      <Button
                        onClick={() => {
                          setQuestion(ask(step, question.text));
                          setNumber((n) => n + 1);
                          window.scrollTo({ top: 0 });
                        }}
                      >
                        같은 단계 한 번 더
                      </Button>
                      {nextStep && (
                        <Button variant="secondary" onClick={() => start(nextStep)}>
                          다음 단계: {nextStep.title}
                        </Button>
                      )}
                      <Link href={`/sessions/${session.id}`} className="inline-flex h-11 items-center rounded-ctl px-5 text-[15px] font-semibold text-ink-2 hover:text-ink">
                        이번 연습 모아 보기
                      </Link>
                    </div>
                  }
                />
              )}
            </MicGate>
          </div>
        </Page>
      </AppShell>
    );
  }

  const history = [
    ...mine.map((s) => ({ id: s.id, title: s.title ?? "구조화 연습", at: s.createdAt, n: s.attempts.length })),
    ...docs.remote.flatMap((r) => (r.summary.kind === "structure" ? [{ id: r.id, title: String(r.summary.title ?? "구조화 연습"), at: Number(r.summary.createdAt ?? r.updatedAt), n: Number(r.summary.attemptCount ?? 0) }] : [])),
  ].sort((a, b) => b.at - a.at);

  return (
    <AppShell>
      <Page>
        <PageHead title="문장 구조화 연습" lead="바로 답하기, 이유, 예시, 내 생각. 답변의 뼈대를 한 단계씩 천천히 쌓아 말합니다. 단계마다 그 부분만 집중해서 봅니다." />
        <Block title="단계" aside={`${passed.size}/${STEPS.length} 통과`}>
          <ol className="border-t border-line">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex items-center gap-5 border-b border-line py-5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-[14px] font-semibold tabular">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[17px] font-semibold">
                    {s.title}
                    {passed.has(s.id) && <span className="text-[13px] font-medium text-good">통과</span>}
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{s.explain}</span>
                </span>
                <Button variant={passed.has(s.id) ? "secondary" : "primary"} onClick={() => start(s)} aria-label={`${s.title} 연습하기`}>
                  연습
                </Button>
              </li>
            ))}
          </ol>
        </Block>
        {history.length > 0 && (
          <Block title="지난 연습">
            <ul className="border-t border-line">
              {history.slice(0, 20).map((h) => (
                <HistoryRow key={h.id} href={`/sessions/${h.id}`} title={h.title} meta={`${formatDay(h.at)} · ${h.n}문항`} />
              ))}
            </ul>
          </Block>
        )}
      </Page>
    </AppShell>
  );
}
