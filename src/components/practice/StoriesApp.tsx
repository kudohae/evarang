"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { FormError } from "@/components/account/parts";
import { Block, formatDay, HistoryRow, Page, PageHead } from "@/components/practice/parts";
import { Button, Spinner } from "@/components/ui";
import { TOPICS } from "@/lib/content/topics";
import { useDocList } from "@/lib/docs/useDocList";
import { newId } from "@/lib/exam/result";
import { generateStory } from "@/lib/stories/request";
import { STORY_LEVELS, type StoryDoc, type StoryLevel } from "@/lib/stories/schema";

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2 text-[14px] font-medium transition-colors ${on ? "border-ink bg-ink text-surface" : "border-line-strong bg-surface text-ink hover:border-ink"}`;

const MEMO_HINT = "예: 작년 여름에 친구 두 명과 부산에 갔다. 해운대에서 수영하고 밤에 시장에서 회를 먹었다. 비가 와서 계획이 틀어졌지만 오히려 카페에서 오래 이야기해서 더 기억에 남는다.";

/** 스토리뱅크: personal experiences turned into English stories that answer many questions. */
export function StoriesApp() {
  const config = useConfig();
  const router = useRouter();
  const docs = useDocList<StoryDoc>("story");
  const [topics, setTopics] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [level, setLevel] = useState<StoryLevel>("IM3");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id: string) => setTopics((t) => (t.includes(id) ? t.filter((x) => x !== id) : t.length >= 3 ? t : [...t, id]));
  const ready = topics.length > 0 && memo.trim().length >= 10;

  const create = async () => {
    setBusy(true);
    setError("");
    const id = newId();
    try {
      const available = config.models.filter((m) => m.available).map((m) => m.id);
      const { story, modelId } = await generateStory({ ref: id, topicIds: topics, memo, level }, available);
      const doc: StoryDoc = { ...story, id, createdAt: Date.now(), topicIds: topics, memo, level, modelId, practice: [] };
      await docs.saveNow(id, doc);
      router.push(`/stories/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const list = [
    ...(docs.local ?? []).flatMap((d) => (d.data ? [{ id: d.id, title: d.data.title, at: d.data.createdAt }] : [])),
    ...docs.remote.map((r) => ({ id: r.id, title: String(r.summary.title ?? "이야기"), at: Number(r.summary.createdAt ?? r.updatedAt) })),
  ].sort((a, b) => b.at - a.at);

  const surveyTopics = TOPICS.filter((t) => t.kind === "survey");
  const randomTopics = TOPICS.filter((t) => t.kind === "random");

  return (
    <AppShell>
      <Page>
        <PageHead title="스토리뱅크" lead="내 경험 하나를 영어 이야기로 만들어 두고, 여러 주제의 질문에 돌려 씁니다. 이야기마다 답변 뼈대, 외울 표현, 다른 질문에 쓰는 요령이 함께 나옵니다." />

        {list.length > 0 && (
          <Block title="내 이야기" aside={`${list.length}개`}>
            <ul className="border-t border-line">
              {list.map((s) => (
                <HistoryRow key={s.id} href={`/stories/${s.id}`} title={s.title} meta={formatDay(s.at)} />
              ))}
            </ul>
          </Block>
        )}

        <Block title="새 이야기 만들기" aside={config.user ? "하루 3번 · 내 API 키는 무제한" : undefined}>
          {!config.auth ? (
            <p className="text-[15px] leading-relaxed text-ink-2">회원 기능이 설정되지 않아 이야기를 만들 수 없습니다.</p>
          ) : !config.user ? (
            <div className="rounded-panel border border-line bg-surface px-6 py-6 shadow-panel">
              <p className="text-[15px] leading-relaxed text-ink-2">이야기 만들기는 로그인한 회원만 쓸 수 있습니다. 만든 이야기는 계정에 저장해 두고 어느 기기에서든 볼 수 있습니다.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/login?next=/stories" className="inline-flex h-11 items-center rounded-ctl bg-primary px-5 text-[15px] font-semibold text-primary-ink">
                  로그인
                </Link>
                <Link href="/signup?next=/stories" className="inline-flex h-11 items-center rounded-ctl border border-line-strong px-5 text-[15px] font-semibold text-ink">
                  가입하기
                </Link>
              </div>
            </div>
          ) : (
            <form
              className="flex flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (ready && !busy) void create();
              }}
            >
              <fieldset>
                <legend className="text-[14px] font-medium text-ink-2">어떤 주제에 쓸 이야기인가요? (3개까지)</legend>
                <p className="mb-2 mt-3 text-[13px] text-ink-3">서베이 주제</p>
                <div className="flex flex-wrap gap-2">
                  {surveyTopics.map((t) => (
                    <button key={t.id} type="button" aria-pressed={topics.includes(t.id)} className={chip(topics.includes(t.id))} onClick={() => toggle(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="mb-2 mt-5 text-[13px] text-ink-3">돌발 주제</p>
                <div className="flex flex-wrap gap-2">
                  {randomTopics.map((t) => (
                    <button key={t.id} type="button" aria-pressed={topics.includes(t.id)} className={chip(topics.includes(t.id))} onClick={() => toggle(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="story-memo" className="text-[14px] font-medium text-ink-2">
                  있었던 일 (한국어로 편하게)
                </label>
                <textarea
                  id="story-memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder={MEMO_HINT}
                  className="rounded-ctl border border-line-strong bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink"
                />
                <p className="text-[13px] text-ink-3">언제, 어디서, 누구와, 무슨 일이 있었고 어떤 기분이었는지 적으면 이야기가 구체적으로 나옵니다.</p>
              </div>

              <fieldset>
                <legend className="text-[14px] font-medium text-ink-2">목표 등급</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STORY_LEVELS.map((l) => (
                    <button key={l} type="button" aria-pressed={level === l} className={chip(level === l)} onClick={() => setLevel(l)}>
                      {l}
                    </button>
                  ))}
                </div>
              </fieldset>

              <FormError>{error}</FormError>
              <div>
                <Button type="submit" disabled={!ready || busy}>
                  {busy ? <Spinner /> : "이야기 만들기"}
                </Button>
              </div>
            </form>
          )}
        </Block>
      </Page>
    </AppShell>
  );
}
