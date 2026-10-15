"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { Block, MicGate, Page, PageHead } from "@/components/practice/parts";
import { Button, Icon, Spinner } from "@/components/ui";
import { Recorder, resolveVoice, speak, useVoices } from "@/lib/client/audio";
import { transcribeBlob } from "@/lib/client/transcribe";
import { SKILLS, skillById } from "@/lib/domain/skills";
import { useAttempts } from "@/lib/domain/useAttempts";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { cardsFromAttempts, type NoteCard } from "@/lib/notes/cards";
import { saidRight } from "@/lib/notes/match";
import { dueCards, mergeReviewState, nextReview, type ReviewState } from "@/lib/notes/review";
import { loadReviewState, saveReviewState } from "@/lib/notes/sync";

const STATE_ID = "reviewstate";
const SESSION_SIZE = 10;

function SayIt({ text }: { text: string }) {
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  return (
    <button type="button" onClick={() => speak(text, voice)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2 hover:text-ink" aria-label="들어보기">
      <Icon name="play" className="size-3" />
    </button>
  );
}

/** One card: the learner says the corrected sentence; the transcript is compared word by word. */
function ReviewCard({ card, stream, onGrade }: { card: NoteCard; stream: MediaStream | null; onGrade: (pass: boolean) => void }) {
  const [stage, setStage] = useState<"ask" | "recording" | "checking" | "result" | "reveal">("ask");
  const [heard, setHeard] = useState("");
  const [pass, setPass] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => () => recorder.current?.discard(), []);

  const startRecording = () => {
    if (!stream) return;
    setError("");
    const r = new Recorder(stream);
    recorder.current = r;
    r.start();
    setStage("recording");
  };

  const stopRecording = async () => {
    const r = recorder.current;
    if (!r) return;
    setStage("checking");
    const rec = await r.stop();
    recorder.current = null;
    try {
      const { transcript } = await transcribeBlob(rec.blob, rec.durationMs);
      setHeard(transcript.text);
      setPass(saidRight(transcript.text, card.after, card.before));
      setStage("result");
    } catch (e) {
      setError((e as Error).message);
      setStage("ask");
    }
  };

  return (
    <div className="rounded-panel border border-line bg-surface px-6 py-6 shadow-panel">
      <p className="text-[13px] text-ink-3">{card.kind === "correction" ? "고칠 표현" : "더 좋게 말할 표현"}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{card.reason}</p>
      <p className="mt-4 text-[13px] text-ink-3">내가 한 말</p>
      <p className="mt-1 text-[17px] text-ink" lang="en">
        {card.before}
      </p>

      {(stage === "result" || stage === "reveal") && (
        <div className="mt-5 border-t border-line pt-5">
          {stage === "result" && (
            <>
              <p className={`text-[16px] font-semibold ${pass ? "text-good" : "text-pen-ink"}`}>{pass ? "맞았습니다" : "아쉽습니다"}</p>
              <p className="mt-1 text-[14px] text-ink-3">
                들린 말: <span lang="en">{heard || "(들리지 않음)"}</span>
              </p>
            </>
          )}
          <p className="mt-3 text-[13px] text-ink-3">고친 문장</p>
          <p className="mt-1 flex items-center gap-3 text-[17px] font-semibold text-ink" lang="en">
            {card.after}
            <SayIt text={card.after} />
          </p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-[14px] text-pen-ink">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {stage === "ask" && (
          <>
            {stream && <Button onClick={startRecording}>고쳐서 말하기</Button>}
            <Button variant="secondary" onClick={() => setStage("reveal")}>
              정답 보기
            </Button>
          </>
        )}
        {stage === "recording" && (
          <Button onClick={() => void stopRecording()}>
            <span className="size-2 animate-pulse rounded-full bg-pen" />다 말했어요
          </Button>
        )}
        {stage === "checking" && <Spinner className="size-5 text-ink-2" />}
        {stage === "result" && (
          <>
            <Button onClick={() => onGrade(pass)}>다음 카드</Button>
            <Button variant="quiet" onClick={() => setStage("ask")}>
              다시 말하기
            </Button>
          </>
        )}
        {stage === "reveal" && (
          <>
            <Button onClick={() => onGrade(true)}>맞혔어요</Button>
            <Button variant="secondary" onClick={() => onGrade(false)}>
              틀렸어요
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Review({ queue, stream, onGrade, onExit }: { queue: NoteCard[]; stream: MediaStream | null; onGrade: (c: NoteCard, pass: boolean) => void; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  if (i >= queue.length) {
    return (
      <div className="rounded-panel border border-line bg-surface px-6 py-10 text-center shadow-panel">
        <p className="text-[18px] font-semibold">복습을 마쳤습니다</p>
        <p className="mt-2 text-[15px] text-ink-2">
          {queue.length}장 중 {right}장을 맞혔습니다. 틀린 카드는 다음 복습에 다시 나옵니다.
        </p>
        <div className="mt-6 flex justify-center">
          <Button onClick={onExit}>첨삭노트로</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-ink-3 tabular">
        {i + 1} / {queue.length}
      </p>
      <ReviewCard
        key={queue[i].id}
        card={queue[i]}
        stream={stream}
        onGrade={(pass) => {
          onGrade(queue[i], pass);
          if (pass) setRight((n) => n + 1);
          setI((n) => n + 1);
        }}
      />
      <button type="button" onClick={onExit} className="self-start text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
        그만하기
      </button>
    </div>
  );
}

/** 첨삭노트: every correction and better expression the feedback gave, reviewed by saying them aloud. */
export function NotesApp() {
  const config = useConfig();
  const { attempts } = useAttempts();
  const keep = syncEnabled(config.user);
  const audio = config.storage?.blob !== false;
  const [state, setState] = useState<ReviewState | null>(null);
  const [queue, setQueue] = useState<NoteCard[] | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const accountOk = useRef(true);
  const latest = useRef<ReviewState>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // This browser's copy merged with the account's, so reviews made on another device are kept.
  useEffect(() => {
    void loadReviewState(keep).then((r) => {
      accountOk.current = r.accountOk;
      latest.current = r.state;
      setState(r.state);
    });
  }, [keep]);

  const cards = useMemo(() => {
    const seen = new Set<string>();
    return cardsFromAttempts(attempts ?? []).filter((c) => !seen.has(c.id) && seen.add(c.id));
  }, [attempts]);

  // Saved here at once; the account copy follows a moment later, merged card by card.
  const update = (next: ReviewState) => {
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
  };

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
  const due = dueCards(cards, state, now);
  const hidden = cards.filter((c) => state[c.id]?.hidden);
  const visible = cards.filter((c) => !state[c.id]?.hidden);
  const groups = [...SKILLS.map((s) => s.id as string), ""].map((skill) => ({ skill, cards: visible.filter((c) => (c.skill ?? "") === skill) })).filter((g) => g.cards.length);

  if (queue) {
    return (
      <AppShell>
        <Page>
          <PageHead title="복습" lead="이유와 내가 한 말을 보고, 고친 문장을 소리 내어 말하세요. 마이크 없이 정답을 보고 스스로 채점해도 됩니다." />
          <div className="mt-10">
            {config.stt ? (
              <MicGateOptional>
                {(stream) => (
                  <Review
                    queue={queue}
                    stream={stream}
                    onGrade={(c, pass) => update({ ...state, [c.id]: nextReview(state[c.id], pass, Date.now()) })}
                    onExit={() => setQueue(null)}
                  />
                )}
              </MicGateOptional>
            ) : (
              <Review queue={queue} stream={null} onGrade={(c, pass) => update({ ...state, [c.id]: nextReview(state[c.id], pass, Date.now()) })} onExit={() => setQueue(null)} />
            )}
          </div>
        </Page>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Page>
        <PageHead title="첨삭노트" lead="모의고사와 연습에서 고친 표현을 모았습니다. 소리 내어 다시 말하며 복습하면, 맞힌 카드는 점점 뜸하게, 틀린 카드는 다시 나옵니다." />

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-surface px-6 py-5 shadow-panel">
          <div>
            <p className="text-[17px] font-semibold">오늘 복습할 카드 {due.length}장</p>
            <p className="mt-1 text-[14px] text-ink-3">전체 {visible.length}장 · 한 번에 {SESSION_SIZE}장씩</p>
          </div>
          <Button disabled={!due.length} onClick={() => setQueue(due.slice(0, SESSION_SIZE))}>
            복습 시작
          </Button>
        </div>

        {!cards.length && (
          <p className="mt-10 text-[15px] leading-relaxed text-ink-2">
            아직 카드가 없습니다. 모의고사나 맞춤형 연습에서 피드백을 받으면 고친 표현이 여기에 쌓입니다.
          </p>
        )}

        {groups.map((g) => (
          <Block key={g.skill || "none"} title={g.skill ? (skillById(g.skill)?.label ?? g.skill) : "분류 안 됨"} aside={`${g.cards.length}장`}>
            <ul className="flex flex-col gap-3">
              {g.cards.map((c) => (
                <NoteRow key={c.id} card={c} box={state[c.id]?.box} onHide={() => update({ ...state, [c.id]: { ...(state[c.id] ?? { box: 1, due: 0, reviews: 0 }), hidden: true } })} />
              ))}
            </ul>
          </Block>
        ))}

        {hidden.length > 0 && (
          <Block title="숨긴 카드" aside={`${hidden.length}장`}>
            {showHidden ? (
              <ul className="flex flex-col gap-3">
                {hidden.map((c) => (
                  <NoteRow key={c.id} card={c} box={state[c.id]?.box} onShow={() => update({ ...state, [c.id]: { ...state[c.id], hidden: false } })} />
                ))}
              </ul>
            ) : (
              <Button variant="secondary" onClick={() => setShowHidden(true)}>
                숨긴 카드 보기
              </Button>
            )}
          </Block>
        )}
      </Page>
    </AppShell>
  );
}

function NoteRow({ card, box, onHide, onShow }: { card: NoteCard; box?: number; onHide?: () => void; onShow?: () => void }) {
  return (
    <li className="rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
      <p className="text-[15px] text-ink-3 line-through decoration-pen/60" lang="en">
        {card.before}
      </p>
      <p className="mt-1 flex items-center gap-3 text-[16px] font-semibold text-ink" lang="en">
        {card.after}
        <SayIt text={card.after} />
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{card.reason}</p>
      <div className="mt-3 flex items-center justify-between gap-4 text-[13px] text-ink-3">
        <span>{box ? `복습 ${box}단계` : "아직 복습 전"}</span>
        {onHide && (
          <button type="button" onClick={onHide} className="underline underline-offset-4 hover:text-ink">
            숨기기
          </button>
        )}
        {onShow && (
          <button type="button" onClick={onShow} className="underline underline-offset-4 hover:text-ink">
            다시 보이기
          </button>
        )}
      </div>
    </li>
  );
}

/** Review works without a microphone too (self-grading), so the mic is offered, not required. */
function MicGateOptional({ children }: { children: (stream: MediaStream | null) => React.ReactNode }) {
  const [skip, setSkip] = useState(false);
  if (skip) return <>{children(null)}</>;
  return (
    <MicGate
      alt={
        <button type="button" onClick={() => setSkip(true)} className="text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
          마이크 없이 하기
        </button>
      }
    >
      {(stream) => children(stream)}
    </MicGate>
  );
}
