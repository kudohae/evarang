"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { PracticeRunner } from "@/components/practice/PracticeRunner";
import { attemptAnswer, attemptQuestion, Block, formatDay, MicGate, Page, PageHead } from "@/components/practice/parts";
import { QuestionDetail } from "@/components/report/QuestionDetail";
import { BackButton, Button, Icon, Spinner } from "@/components/ui";
import { resolveVoice, speak, useVoices } from "@/lib/client/audio";
import { topicById } from "@/lib/content/topics";
import type { Attempt } from "@/lib/domain/attempt";
import { useAttempts } from "@/lib/domain/useAttempts";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { loadDoc, scheduleSync } from "@/lib/docs/sync";
import { practiceQuestion } from "@/lib/practice/questions";
import type { StoryDoc } from "@/lib/stories/schema";
import type { ExamQuestion } from "@/lib/types";

const PART_TITLE: Record<string, string> = { opening: "바로 답하기", reason: "이유", example: "예시·경험", closing: "생각·감정으로 마무리" };

/** One story: the text (editable), its skeleton, phrases to keep, and speaking practice on its topics. */
export function StoryView({ id }: { id: string }) {
  const config = useConfig();
  const { level } = useAttempts();
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  const [story, setStory] = useState<StoryDoc | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [number, setNumber] = useState(1);
  // The latest copy, for saves that finish after newer ones started (transcript, then feedback).
  const latest = useRef<StoryDoc | null>(null);
  const keep = syncEnabled(config.user);
  const audio = config.storage?.blob !== false;

  useEffect(() => {
    void loadDoc<StoryDoc>("story", id, { account: Boolean(config.user) })
      .then((d) => {
        latest.current = d?.data ?? null;
        setStory(latest.current);
      })
      .catch(() => setStory(null));
  }, [id, config.user]);

  const save = async (next: StoryDoc) => {
    latest.current = next;
    setStory(next);
    await localDocs.put("story", id, next);
    if (keep) scheduleSync("story", id, undefined, { audio });
  };

  if (story === undefined) {
    return (
      <AppShell>
        <div className="flex justify-center pt-24 text-ink-3">
          <Spinner className="size-5" />
        </div>
      </AppShell>
    );
  }
  if (!story) {
    return (
      <AppShell>
        <Page>
          <PageHead title="이야기를 찾지 못했습니다" lead="이 브라우저나 계정에 이 이야기가 없습니다." />
        </Page>
      </AppShell>
    );
  }

  const practiceOn = (topicId: string) => {
    setQuestion(practiceQuestion({ type: "past", topicId }));
    setNumber((story.practice?.length ?? 0) + 1);
    window.setTimeout(() => document.getElementById("story-practice")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const record = async (a: Attempt) => {
    const cur = latest.current ?? story;
    await save({ ...cur, practice: [...(cur.practice ?? []).filter((x) => x.id !== a.id), a] });
  };

  return (
    <AppShell>
      <Page>
        <PageHead title={story.title} lead={`${story.level} 목표 · ${formatDay(story.createdAt)}`} back={<BackButton href="/stories">스토리뱅크</BackButton>} />

        <Block title="이야기">
          {editing ? (
            <div className="flex flex-col gap-3">
              <textarea
                aria-label="이야기 고치기"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={10}
                lang="en"
                className="rounded-ctl border border-line-strong bg-surface px-4 py-3 text-[16px] leading-[1.8] text-ink outline-none focus:border-ink"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    void save({ ...(latest.current ?? story), story: draft.trim() });
                    setEditing(false);
                  }}
                  disabled={!draft.trim()}
                >
                  저장
                </Button>
                <Button variant="quiet" onClick={() => setEditing(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-line text-[17px] leading-[1.85] text-ink" lang="en">
                {story.story}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => speak(story.story, voice)}>
                  <Icon name="play" className="size-3.5" />
                  들어보기
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setDraft(story.story);
                    setEditing(true);
                  }}
                >
                  고치기
                </Button>
              </div>
            </>
          )}
        </Block>

        {story.outline?.length > 0 && (
          <Block title="답변 뼈대">
            <ol className="flex flex-col gap-3">
              {story.outline.map((o, i) => (
                <li key={i} className="rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
                  <p className="text-[13px] font-semibold text-ink-3">{PART_TITLE[o.part] ?? o.part}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink" lang="en">
                    {o.text}
                  </p>
                </li>
              ))}
            </ol>
          </Block>
        )}

        {story.expressions?.length > 0 && (
          <Block title="외워 둘 표현">
            <ul className="border-t border-line">
              {story.expressions.map((x, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3">
                  <span className="text-[16px] font-medium text-ink" lang="en">
                    {x.en}
                  </span>
                  <span className="text-[14px] text-ink-2">{x.ko}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {story.tips?.length > 0 && (
          <Block title="다른 질문에 쓰는 요령">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-ink-2">
              {story.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Block>
        )}

        <Block title="말하기 연습">
          <p className="text-[15px] leading-relaxed text-ink-2">주제를 고르면 그 주제의 과거 경험 질문이 나옵니다. 이야기를 그 질문에 맞게 바꿔 말해 보세요.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {[...new Set([...(story.topicIds ?? []), ...(story.reusable_for ?? [])])].map((tid) => (
              <button key={tid} type="button" onClick={() => practiceOn(tid)} className="rounded-full border border-line-strong bg-surface px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:border-ink">
                {topicById(tid)?.label ?? tid}
              </button>
            ))}
          </div>
          <div id="story-practice" className="mt-8">
            {question && (
              <MicGate>
                {(stream) => (
                  <PracticeRunner
                    key={`${id}:${number}`}
                    docId={id}
                    kind="story"
                    number={number}
                    source="story"
                    question={question}
                    lens="type.past"
                    level={level}
                    stream={stream}
                    onAttempt={record}
                    after={
                      <div className="border-t border-line pt-6">
                        <Button variant="secondary" onClick={() => setQuestion(null)}>
                          다른 주제로 연습
                        </Button>
                      </div>
                    }
                  />
                )}
              </MicGate>
            )}
          </div>
          {(story.practice?.length ?? 0) > 0 && !question && (
            <div className="mt-10 flex flex-col gap-14">
              <p className="text-[14px] font-semibold text-ink-3">지난 연습 {story.practice.length}번</p>
              {[...story.practice].reverse().map((a) => (
                <QuestionDetail key={a.id} question={attemptQuestion(a)} answer={attemptAnswer(a)} feedback={a.feedback} kind="story" showNumber={false} />
              ))}
            </div>
          )}
        </Block>
      </Page>
    </AppShell>
  );
}
