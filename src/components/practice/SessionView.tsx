"use client";

import { useEffect, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { attemptAnswer, attemptQuestion, formatDay, Page, PageHead } from "@/components/practice/parts";
import { QuestionDetail } from "@/components/report/QuestionDetail";
import { Spinner } from "@/components/ui";
import type { Session } from "@/lib/domain/session";
import { loadDoc } from "@/lib/docs/sync";

const BACK: Record<string, { href: string; label: string }> = {
  drill: { href: "/practice", label: "맞춤형 연습" },
  structure: { href: "/structure", label: "문장 구조화 연습" },
};

/** A past practice session (맞춤형 연습 or 구조화 연습): every answer with its feedback. */
export function SessionView({ id }: { id: string }) {
  const config = useConfig();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    void loadDoc<Session>("session", id, { account: Boolean(config.user) })
      .then((d) => setSession(d?.data ?? null))
      .catch(() => setSession(null));
  }, [id, config.user]);

  return (
    <AppShell>
      <Page>
        {session === undefined ? (
          <div className="flex justify-center pt-24 text-ink-3">
            <Spinner className="size-5" />
          </div>
        ) : !session ? (
          <PageHead title="연습 기록이 없습니다" lead="이 브라우저나 계정에서 이 기록을 찾지 못했습니다." />
        ) : (
          <>
            <PageHead title={session.title ?? "연습"} lead={`${BACK[session.kind]?.label ?? "연습"} · ${formatDay(session.createdAt)} · ${session.attempts.length}문항`}>
              {BACK[session.kind] && (
                <a href={BACK[session.kind].href} className="mt-4 inline-block text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
                  {BACK[session.kind].label}로 돌아가기
                </a>
              )}
            </PageHead>
            <div className="mt-12 flex flex-col gap-16">
              {session.attempts.map((a) => (
                <QuestionDetail key={a.id} question={attemptQuestion(a)} answer={attemptAnswer(a)} feedback={a.feedback} kind="session" showNumber={false} />
              ))}
            </div>
          </>
        )}
      </Page>
    </AppShell>
  );
}
