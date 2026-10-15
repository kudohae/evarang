"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { Block, formatDay, HistoryRow, MicGate, Page, PageHead } from "@/components/practice/parts";
import { BackButton, Button, Chip } from "@/components/ui";
import { TOPICS, topicById } from "@/lib/content/topics";
import type { Attempt } from "@/lib/domain/attempt";
import { skillProfile, suggestLens } from "@/lib/domain/profile";
import type { Session } from "@/lib/domain/session";
import { skillById } from "@/lib/domain/skills";
import { useAttempts } from "@/lib/domain/useAttempts";
import { localDocs } from "@/lib/docs/local";
import { useDocList } from "@/lib/docs/useDocList";
import { recordAttempt } from "@/lib/practice/record";
import { TYPE_LABEL } from "@/lib/exam/compose";
import { newId } from "@/lib/exam/result";
import type { LensId } from "@/lib/feedback/lenses";
import { PRACTICE_TYPES, practiceQuestion } from "@/lib/practice/questions";
import type { ExamQuestion, QuestionType } from "@/lib/types";

type Setting = { mode: "type"; type: QuestionType } | { mode: "topic"; topicId: string };


function titleOf(s: Setting): string {
  return s.mode === "type" ? TYPE_LABEL[s.type] : `${topicById(s.topicId)?.label ?? "주제"} 주제`;
}

/** 맞춤형 연습: one question at a time, chosen by question type or by topic, with feedback on each answer. */
export function PracticeApp() {
  const { attempts, level } = useAttempts();
  const docs = useDocList<Session>("session");
  const [setting, setSetting] = useState<Setting | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [number, setNumber] = useState(1);
  // The latest copy, for saves that finish after newer ones started (transcript, then feedback).
  const latest = useRef<Session | null>(null);

  const weak = useMemo(() => skillProfile(attempts ?? []).filter((s) => s.weak > 0).slice(0, 3), [attempts]);
  const surveyTopics = TOPICS.filter((t) => t.kind === "survey");
  const randomTopics = TOPICS.filter((t) => t.kind === "random");

  const start = (s: Setting) => {
    setSetting(s);
    latest.current = { id: newId(), kind: "drill", createdAt: Date.now(), title: titleOf(s), settings: s, attempts: [] };
    setSession(latest.current);
    setQuestion(practiceQuestion(s.mode === "type" ? { type: s.type } : { topicId: s.topicId }));
    setNumber(1);
    window.scrollTo({ top: 0 });
  };

  const next = () => {
    if (!setting || !question) return;
    setQuestion(practiceQuestion(setting.mode === "type" ? { type: setting.type, avoid: question.text } : { topicId: setting.topicId, avoid: question.text }));
    setNumber((n) => n + 1);
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

  if (setting && session && question) {
    return (
      <AppShell>
        <Page>
          <PageHead
            title={titleOf(setting)}
            lead={`${question.topicLabel} · ${TYPE_LABEL[question.type]}. 질문은 몇 번이고 다시 듣고, 글자로 볼 수도 있습니다. 마음에 들지 않으면 다시 말하세요.`}
            back={<BackButton onClick={() => (setSetting(null), setSession(null), setQuestion(null))}>다른 연습 고르기</BackButton>}
          />
          <div className="mt-10">
            <MicGate>
              {(stream) => (
                <PracticeRunner
                  key={`${session.id}:${number}`}
                  docId={session.id}
                  kind="session"
                  number={number}
                  source="drill"
                  question={question}
                  lens={`type.${question.type}` as LensId}
                  level={level}
                  stream={stream}
                  onAttempt={record}
                  after={
                    <div className="flex flex-wrap gap-2 border-t border-line pt-6">
                      <Button onClick={next}>같은 설정으로 한 문항 더</Button>
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
    ...(docs.local ?? []).flatMap((d) => (d.data?.kind === "drill" ? [{ id: d.id, title: d.data.title ?? "연습", at: d.data.createdAt, n: d.data.attempts.length }] : [])),
    ...docs.remote.flatMap((r) => (r.summary.kind === "drill" ? [{ id: r.id, title: String(r.summary.title ?? "연습"), at: Number(r.summary.createdAt ?? r.updatedAt), n: Number(r.summary.attemptCount ?? 0) }] : [])),
  ].sort((a, b) => b.at - a.at);

  return (
    <AppShell>
      <Page>
        <PageHead title="맞춤형 연습" lead="약한 유형이나 주제만 골라 한 문항씩 답하고, 답할 때마다 첨삭과 모범 답안을 받습니다." />

        <Block title="약한 곳부터" aside={attempts && !weak.length ? "평가받은 답변이 쌓이면 보입니다" : undefined}>
          {weak.length ? (
            <ul className="flex flex-col gap-3">
              {weak.map((w) => {
                const lens = suggestLens(w.skill);
                const type = lens.slice(5) as QuestionType;
                return (
                  <li key={w.skill} className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
                    <span>
                      <span className="block text-[16px] font-semibold">{skillById(w.skill)?.label ?? w.skill}</span>
                      <span className="text-[13px] text-ink-3">
                        약점으로 {w.weak}번 · 강점으로 {w.strong}번
                      </span>
                    </span>
                    <Button variant="secondary" onClick={() => start({ mode: "type", type })}>
                      {TYPE_LABEL[type]} 연습
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[14px] leading-relaxed text-ink-3">모의고사나 연습에서 피드백을 받으면, 자주 틀린 부분을 모아 맞는 유형을 추천합니다.</p>
          )}
        </Block>

        <Block title="문항별">
          <div className="flex flex-wrap gap-2">
            {PRACTICE_TYPES.map((t) => (
              <Chip key={t} on={false} onClick={() => start({ mode: "type", type: t })}>
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Block>

        <Block title="주제별">
          <p className="mb-3 text-[13px] text-ink-3">서베이 주제</p>
          <div className="flex flex-wrap gap-2">
            {surveyTopics.map((t) => (
              <Chip key={t.id} on={false} onClick={() => start({ mode: "topic", topicId: t.id })}>
                {t.label}
              </Chip>
            ))}
          </div>
          <p className="mb-3 mt-6 text-[13px] text-ink-3">돌발 주제</p>
          <div className="flex flex-wrap gap-2">
            {randomTopics.map((t) => (
              <Chip key={t.id} on={false} onClick={() => start({ mode: "topic", topicId: t.id })}>
                {t.label}
              </Chip>
            ))}
          </div>
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
