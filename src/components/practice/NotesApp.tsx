"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { Page, PageHead } from "@/components/practice/parts";
import { useToast } from "@/components/Toast";
import { BackButton, Button, Chip, Icon, Progress, Spinner } from "@/components/ui";
import { useMicrophone } from "@/lib/capture/useMicrophone";
import { Recorder, resolveVoice, speak, useMicLevel, useVoices } from "@/lib/client/audio";
import { transcribeBlob } from "@/lib/client/transcribe";
import { SKILL_GROUP_LABEL, SKILLS, skillById, type SkillGroup } from "@/lib/domain/skills";
import { useAttempts } from "@/lib/domain/useAttempts";
import { syncEnabled } from "@/lib/docs/policy";
import { localDocs } from "@/lib/docs/local";
import { cardsFromAttempts, mergeDuplicates, migrateState, type NoteCard } from "@/lib/notes/cards";
import { countCards, filterCards, LEARNED_BOX, type NoteFilter, type TypeFilter } from "@/lib/notes/filters";
import { saidRight, wordDiff } from "@/lib/notes/match";
import { mergeReviewState, nextReview, type ReviewState } from "@/lib/notes/review";
import { loadReviewState, saveReviewState } from "@/lib/notes/sync";

const STATE_ID = "reviewstate";
const SESSION_SIZE = 10;
const FILTER_KEY = "evarang:notes-filter";
const GROUPS = Object.keys(SKILL_GROUP_LABEL) as SkillGroup[];
const DEFAULT_FILTER: NoteFilter = { type: "all", status: "due", source: "all" };

function useSpeak() {
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  return useCallback((text: string) => speak(text, voice), [voice]);
}

function SayIt({ text, size = "sm" }: { text: string; size?: "sm" | "md" }) {
  const say = useSpeak();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        say(text);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-ink-2 transition-[color,border-color,transform] hover:border-ink hover:text-ink active:scale-95 ${size === "md" ? "size-10" : "size-8"}`}
      aria-label="들어보기"
    >
      <Icon name="speaker" className={size === "md" ? "size-4.5" : "size-3.5"} />
    </button>
  );
}

function typeLabel(t: TypeFilter): string {
  if (t === "all") return "전체";
  if (t === "none") return "분류 안 됨";
  if (t.startsWith("group:")) return SKILL_GROUP_LABEL[t.slice(6) as SkillGroup];
  return skillById(t)?.label ?? t;
}

// ── Review ────────────────────────────────────────────────

type Stage = "ask" | "recording" | "checking" | "result" | "reveal";

function MicLevel({ stream }: { stream: MediaStream }) {
  const level = useMicLevel(stream, true);
  return (
    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-pen transition-[width] duration-75" style={{ width: `${Math.min(100, level * 140)}%` }} />
    </div>
  );
}

/** One card: read why, see what you said, say it right. Space reveals, 1/2 grade, Enter moves on. */
function ReviewCard({ card, canSpeak, onGrade }: { card: NoteCard; canSpeak: boolean; onGrade: (pass: boolean) => void }) {
  const mic = useMicrophone();
  const say = useSpeak();
  const [stage, setStage] = useState<Stage>("ask");
  const [heard, setHeard] = useState("");
  const [pass, setPass] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => () => recorder.current?.discard(), []);

  const startSpeaking = async () => {
    setError("");
    const stream = mic.stream ?? (await mic.request());
    if (!stream) return setError("마이크를 쓸 수 없습니다. 정답 보기로 스스로 채점할 수 있습니다.");
    const r = new Recorder(stream);
    recorder.current = r;
    r.start();
    setStage("recording");
  };

  const stopSpeaking = async () => {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    setStage("checking");
    const rec = await r.stop();
    try {
      const { transcript } = await transcribeBlob(rec.blob, rec.durationMs);
      const ok = saidRight(transcript.text, card.after, card.before);
      setHeard(transcript.text);
      setPass(ok);
      setStage("result");
      if (!ok) say(card.after);
    } catch (e) {
      setError((e as Error).message);
      setStage("ask");
    }
  };

  const grade = useCallback((p: boolean) => onGrade(p), [onGrade]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (stage === "ask" && e.key === " ") {
        e.preventDefault();
        setStage("reveal");
      } else if (stage === "reveal" && e.key === "1") grade(true);
      else if (stage === "reveal" && e.key === "2") grade(false);
      else if (stage === "result" && e.key === "Enter") {
        e.preventDefault();
        grade(pass);
      } else if (stage === "recording" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        void stopSpeaking();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answerShown = stage === "result" || stage === "reveal";

  return (
    <div className="pop rounded-panel border border-line bg-surface px-6 py-7 shadow-panel md:px-8">
      <div className="flex items-center gap-2 text-[13px] text-ink-3">
        <span className={`rounded-full px-2.5 py-0.5 font-semibold ${card.kind === "correction" ? "bg-pen-soft text-pen-ink" : "bg-good-soft text-good"}`}>{card.kind === "correction" ? "고칠 표현" : "더 좋은 표현"}</span>
        {card.skill && <span>{skillById(card.skill)?.label}</span>}
      </div>
      <p className="mt-4 text-[16px] leading-[1.7] text-ink">{card.reason}</p>
      <div className="mt-5 rounded-ctl bg-wash px-4 py-3">
        <p className="text-[12px] font-semibold text-ink-3">내가 한 말</p>
        <p className="mt-1 text-[17px] text-ink-2" lang="en">
          {card.before}
        </p>
      </div>

      {!answerShown && <p className="mt-5 text-[15px] font-medium text-ink">고친 문장을 소리 내어 말해 보세요.</p>}

      {stage === "result" && (
        <div className="rise mt-5">
          <p className={`flex items-center gap-2 text-[17px] font-bold ${pass ? "text-good" : "text-pen-ink"}`}>
            <Icon name={pass ? "check" : "x"} className="size-5" />
            {pass ? "맞았습니다" : "아쉽습니다"}
          </p>
          <p className="mt-1 text-[14px] text-ink-3">
            들린 말: <span lang="en">{heard || "(들리지 않음)"}</span>
          </p>
        </div>
      )}

      {answerShown && (
        <div className="rise mt-4 rounded-ctl border border-line-strong px-4 py-3">
          <p className="text-[12px] font-semibold text-ink-3">고친 문장</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="min-w-0 flex-1 text-[19px] font-semibold leading-snug" lang="en">
              {stage === "result"
                ? wordDiff(heard, card.after).map((w, i) => (
                    <span key={i} className={w.said ? "text-ink" : "rounded bg-pen-soft px-0.5 text-pen-ink underline decoration-pen/60 decoration-2 underline-offset-4"}>
                      {w.word}{" "}
                    </span>
                  ))
                : card.after}
            </p>
            <SayIt text={card.after} size="md" />
          </div>
          {stage === "result" && !pass && <p className="mt-2 text-[13px] text-ink-3">강조된 단어를 놓쳤습니다.</p>}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-[14px] text-pen-ink">
          {error}
        </p>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-2">
        {stage === "ask" && (
          <>
            {canSpeak && (
              <Button size="lg" onClick={() => void startSpeaking()}>
                <Icon name="mic" className="size-4" />
                말하기
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => setStage("reveal")}>
              <Icon name="eye" className="size-4" />
              정답 보기 <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[11px] text-ink-3 md:inline">Space</kbd>
            </Button>
          </>
        )}
        {stage === "recording" && mic.stream && (
          <>
            <Button size="lg" onClick={() => void stopSpeaking()}>
              <Icon name="stop" className="size-3.5" />다 말했어요
            </Button>
            <span className="inline-flex items-center gap-2 text-[14px] text-ink-2">
              <span className="size-2 animate-pulse rounded-full bg-pen" />
              듣는 중
            </span>
            <MicLevel stream={mic.stream} />
          </>
        )}
        {stage === "checking" && (
          <span className="inline-flex h-13 items-center gap-2 text-[15px] text-ink-2">
            <Spinner className="size-5" />
            확인하는 중
          </span>
        )}
        {stage === "result" && (
          <>
            <Button size="lg" onClick={() => grade(pass)}>
              다음 카드
              <Icon name="arrow" className="size-4" />
            </Button>
            {!pass && (
              <>
                <Button size="lg" variant="secondary" onClick={() => setStage("ask")}>
                  <Icon name="replay" className="size-4" />
                  다시 말하기
                </Button>
                <Button size="lg" variant="quiet" onClick={() => grade(true)}>
                  맞게 말했어요
                </Button>
              </>
            )}
          </>
        )}
        {stage === "reveal" && (
          <>
            <Button size="lg" onClick={() => grade(true)}>
              <Icon name="check" className="size-4" />
              맞혔어요 <kbd className="ml-1 hidden rounded border border-primary-ink/20 px-1.5 text-[11px] md:inline">1</kbd>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => grade(false)}>
              <Icon name="x" className="size-4" />
              틀렸어요 <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[11px] text-ink-3 md:inline">2</kbd>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Review({ queue, canSpeak, onGrade, onExit, label }: { queue: NoteCard[]; canSpeak: boolean; onGrade: (c: NoteCard, pass: boolean) => void; onExit: () => void; label: string }) {
  const [i, setI] = useState(0);
  const [missed, setMissed] = useState<NoteCard[]>([]);
  const [round, setRound] = useState(queue);
  const right = i - missed.length;

  if (i >= round.length) {
    return (
      <div className="pop rounded-panel border border-line bg-surface px-6 py-10 text-center shadow-panel">
        <p className="text-[22px] font-bold tracking-[-0.01em]">복습을 마쳤습니다</p>
        <p className="mt-2 text-[15px] text-ink-2">
          {round.length}장 중 {right}장을 맞혔습니다. {missed.length ? "틀린 카드는 다음 복습에 다시 나옵니다." : "모두 맞혔습니다."}
        </p>
        <div className="mx-auto mt-5 max-w-[280px]">
          <Progress value={round.length ? right / round.length : 0} label="맞힌 비율" />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {missed.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setRound(missed);
                setMissed([]);
                setI(0);
              }}
            >
              <Icon name="replay" className="size-4" />
              틀린 {missed.length}장 다시
            </Button>
          )}
          <Button onClick={onExit}>첨삭노트로</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <span className="shrink-0 text-[14px] font-semibold text-ink-2 tabular">
          {i + 1} / {round.length}
        </span>
        <Progress value={i / round.length} label={`${label} 복습 진행`} />
      </div>
      <ReviewCard
        key={`${round[i].id}:${i}`}
        card={round[i]}
        canSpeak={canSpeak}
        onGrade={(pass) => {
          onGrade(round[i], pass);
          if (!pass) setMissed((m) => [...m, round[i]]);
          setI((n) => n + 1);
        }}
      />
    </div>
  );
}

// ── List ──────────────────────────────────────────────────

function CardRow({ card, box, due, onPractice, onHide, onShow }: { card: NoteCard; box?: number; due: boolean; onPractice: () => void; onHide?: () => void; onShow?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-panel border border-line bg-surface shadow-panel transition-[border-color,transform] duration-150 hover:border-line-strong">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-5 py-4 text-left active:scale-[0.995]">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] text-ink-3 line-through decoration-pen/50" lang="en">
            {card.before}
          </span>
          <span className="mt-0.5 block text-[17px] font-semibold leading-snug text-ink" lang="en">
            {card.after}
          </span>
        </span>
        <span className="mt-1 flex shrink-0 items-center gap-2">
          {(card.times ?? 1) > 1 && <span className="rounded-full bg-pen-soft px-2 py-0.5 text-[11px] font-bold text-pen-ink tabular">{card.times}번</span>}
          {due && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-ink">복습</span>}
          <Icon name="chevron" className={`size-4 text-ink-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="rise border-t border-line px-5 pb-4 pt-3">
          <p className="text-[15px] leading-relaxed text-ink-2">{card.reason}</p>
          {(card.times ?? 1) > 1 && <p className="mt-2 text-[13px] font-medium text-pen-ink">같은 실수를 답변 {card.times}개에서 했습니다.</p>}
          <p className="mt-3 text-[13px] text-ink-3">
            {card.source === "exam" ? "모의고사" : "연습"} · {new Date(card.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} · {box ? `복습 ${box}단계${box >= LEARNED_BOX ? " · 익힘" : ""}` : "아직 복습 전"}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] text-ink-3" lang="en">
            질문: {card.question}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <SayIt text={card.after} />
            <Button variant="secondary" onClick={onPractice}>
              <Icon name="mic" className="size-4" />이 카드 연습
            </Button>
            {onHide && (
              <Button variant="quiet" onClick={onHide}>
                <Icon name="eyeOff" className="size-4" />
                숨기기
              </Button>
            )}
            {onShow && (
              <Button variant="quiet" onClick={onShow}>
                <Icon name="eye" className="size-4" />
                다시 보이기
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** 첨삭노트: every correction and better expression the feedback gave, filtered by mistake type and reviewed aloud. */
export function NotesApp() {
  const config = useConfig();
  const toast = useToast();
  const { attempts } = useAttempts();
  const keep = syncEnabled(config.user);
  const audio = config.storage?.blob !== false;
  const [state, setState] = useState<ReviewState | null>(null);
  const [queue, setQueue] = useState<{ cards: NoteCard[]; label: string } | null>(null);
  const [filter, setFilter] = useState<NoteFilter>(() => {
    try {
      return { ...DEFAULT_FILTER, ...JSON.parse(localStorage.getItem(FILTER_KEY) ?? "{}") };
    } catch {
      return DEFAULT_FILTER;
    }
  });
  const accountOk = useRef(true);
  const latest = useRef<ReviewState>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const migrated = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(filter));
    } catch {}
  }, [filter]);

  // This browser's copy merged with the account's, so reviews made on another device are kept.
  useEffect(() => {
    void loadReviewState(keep).then((r) => {
      accountOk.current = r.accountOk;
      latest.current = r.state;
      setState(r.state);
    });
  }, [keep]);

  const raw = useMemo(() => cardsFromAttempts(attempts ?? []), [attempts]);
  const cards = useMemo(() => mergeDuplicates(raw), [raw]);

  // Saved here at once; the account copy follows a moment later, merged card by card.
  const update = useCallback(
    (next: ReviewState) => {
      latest.current = next;
      setState(next);
      void localDocs.put("note", STATE_ID, { cards: next }).catch(() => {});
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void saveReviewState(latest.current, { keep, accountOk: accountOk.current, audio }).then((merged) => {
          latest.current = mergeReviewState(latest.current, merged);
          setState(latest.current);
        });
      }, 1200);
    },
    [keep, audio],
  );

  // Review states of the first version used index-based card ids; move them once.
  useEffect(() => {
    if (migrated.current || state === null || attempts === null) return;
    migrated.current = true;
    const moved = migrateState(state, raw);
    if (JSON.stringify(moved) !== JSON.stringify(state)) update(moved);
  }, [state, attempts, raw, update]);

  if (attempts === null || state === null) {
    return (
      <AppShell>
        <div className="flex justify-center pt-24 text-ink-3">
          <Spinner className="size-5" />
        </div>
      </AppShell>
    );
  }

  const now = Date.now();
  const counts = countCards(cards, state, now);
  const all = counts.all ?? { total: 0, due: 0 };
  const shown = filterCards(cards, state, filter, now);
  const reviewable = filter.status === "due" ? shown : shown.filter((c) => !state[c.id]?.hidden);
  const set = (patch: Partial<NoteFilter>) => setFilter((f) => ({ ...f, ...patch }));
  const group = filter.type.startsWith("group:") ? (filter.type.slice(6) as SkillGroup) : filter.type.includes(".") ? (filter.type.split(".")[0] as SkillGroup) : null;
  const count = (k: string) => (counts[k] as { total: number; due: number } | undefined) ?? { total: 0, due: 0 };
  const grade = (c: NoteCard, pass: boolean) => update({ ...latest.current, [c.id]: nextReview(latest.current[c.id], pass, Date.now()) });

  if (queue) {
    return (
      <AppShell>
        <Page>
          <PageHead
            title="복습"
            lead="이유와 내가 한 말을 보고, 고친 문장을 소리 내어 말하세요. 말하면 받아써서 맞는지 확인하고, 마이크 없이 정답을 보고 스스로 채점해도 됩니다."
            back={<BackButton onClick={() => setQueue(null)}>첨삭노트</BackButton>}
          />
          <div className="mt-8">
            <Review queue={queue.cards} label={queue.label} canSpeak={config.stt} onGrade={grade} onExit={() => setQueue(null)} />
          </div>
        </Page>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Page>
        <PageHead title="첨삭노트" lead="모의고사와 연습에서 고친 표현이 모두 여기 모입니다. 틀린 유형을 골라 소리 내어 다시 말하면, 맞힌 카드는 점점 뜸하게, 틀린 카드는 다시 나옵니다." />

        <div className="rise mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "오늘 복습", value: all.due, on: filter.status === "due", status: "due" as const },
            { label: "전체 카드", value: all.total, on: filter.status === "all", status: "all" as const },
            { label: "익힌 카드", value: counts.learned, on: filter.status === "learned", status: "learned" as const },
          ].map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => set({ status: s.status })}
              aria-pressed={s.on}
              className={`rounded-panel border px-4 py-4 text-left shadow-panel transition-[border-color,transform] duration-150 active:scale-[0.98] ${s.on ? "border-ink bg-surface" : "border-line bg-surface hover:border-line-strong"}`}
            >
              <span className="block text-[13px] text-ink-3">{s.label}</span>
              <span className="mt-1 block text-[26px] font-bold tabular tracking-[-0.02em]">{s.value}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Progress value={all.total ? counts.learned / all.total : 0} label="익힌 카드 비율" />
        </div>

        <section className="mt-10" aria-label="오답 유형">
          <p className="text-[13px] font-semibold text-ink-3">오답 유형</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip on={filter.type === "all"} onClick={() => set({ type: "all" })} count={filter.status === "due" ? all.due : all.total}>
              전체
            </Chip>
            {GROUPS.filter((g) => count(`group:${g}`).total > 0).map((g) => (
              <Chip key={g} on={group === g} onClick={() => set({ type: `group:${g}` })} count={filter.status === "due" ? count(`group:${g}`).due : count(`group:${g}`).total}>
                {SKILL_GROUP_LABEL[g]}
              </Chip>
            ))}
            {count("none").total > 0 && (
              <Chip on={filter.type === "none"} onClick={() => set({ type: "none" })} count={filter.status === "due" ? count("none").due : count("none").total}>
                분류 안 됨
              </Chip>
            )}
          </div>
          {group && (
            <div className="rise mt-3 flex flex-wrap gap-2 border-l-2 border-line pl-3">
              {SKILLS.filter((s) => s.group === group && count(s.id).total > 0).map((s) => (
                <Chip key={s.id} on={filter.type === s.id} onClick={() => set({ type: filter.type === s.id ? `group:${group}` : s.id })} count={filter.status === "due" ? count(s.id).due : count(s.id).total}>
                  {s.label}
                </Chip>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {(["due", "all", "learned", "hidden"] as const).map((st) => (
              <Chip key={st} on={filter.status === st} onClick={() => set({ status: st })}>
                {{ due: "오늘 복습", all: "전체", learned: "익힘", hidden: `숨김 ${counts.hidden}` }[st]}
              </Chip>
            ))}
            <span className="mx-1 h-6 w-px bg-line" aria-hidden />
            {(["all", "exam", "practice"] as const).map((src) => (
              <Chip key={src} on={filter.source === src} onClick={() => set({ source: src })}>
                {{ all: "모든 출처", exam: "모의고사", practice: "연습" }[src]}
              </Chip>
            ))}
          </div>
        </section>

        <div className="sticky top-2 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface/95 px-5 py-4 shadow-panel backdrop-blur">
          <p className="text-[15px] text-ink">
            <b className="font-semibold">{typeLabel(filter.type)}</b> · {shown.length}장
          </p>
          <Button
            disabled={!reviewable.length || filter.status === "hidden"}
            onClick={() => {
              window.scrollTo({ top: 0 });
              setQueue({ cards: reviewable.slice(0, SESSION_SIZE), label: typeLabel(filter.type) });
            }}
          >
            <Icon name="play" className="size-3.5" />
            {Math.min(SESSION_SIZE, reviewable.length)}장 복습 시작
          </Button>
        </div>

        {!cards.length ? (
          <div className="mt-10 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="text-[16px] font-semibold">아직 카드가 없습니다</p>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">모의고사나 맞춤형 연습에서 피드백을 받으면 고친 표현이 여기에 쌓입니다.</p>
          </div>
        ) : !shown.length ? (
          <div className="mt-10 rounded-panel border border-dashed border-line-strong px-6 py-10 text-center">
            <p className="text-[16px] font-semibold">{filter.status === "due" ? "오늘 복습할 카드를 모두 끝냈습니다" : "이 조건에 맞는 카드가 없습니다"}</p>
            {filter.status === "due" && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" onClick={() => set({ status: "all" })}>
                  전체 카드 보기
                </Button>
              </div>
            )}
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {shown.map((c) => {
              const s = state[c.id];
              return (
                <CardRow
                  key={c.id}
                  card={c}
                  box={s?.box}
                  due={!s?.hidden && (!s || s.due <= now)}
                  onPractice={() => setQueue({ cards: [c], label: "카드 하나" })}
                  onHide={
                    s?.hidden
                      ? undefined
                      : () => {
                          update({ ...latest.current, [c.id]: { ...(latest.current[c.id] ?? { box: 1, due: 0, reviews: 0 }), hidden: true } });
                          toast("카드를 숨겼습니다", "info");
                        }
                  }
                  onShow={
                    s?.hidden
                      ? () => {
                          update({ ...latest.current, [c.id]: { ...latest.current[c.id], hidden: false } });
                          toast("카드를 다시 보입니다", "info");
                        }
                      : undefined
                  }
                />
              );
            })}
          </ul>
        )}
      </Page>
    </AppShell>
  );
}
