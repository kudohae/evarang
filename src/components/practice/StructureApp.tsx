"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { Block, MicGate, Page, PageHead } from "@/components/practice/parts";
import { useToast } from "@/components/Toast";
import { BackButton, Button, Chip, Icon, Spinner } from "@/components/ui";
import { keepAndTranscribe } from "@/lib/capture/pipeline";
import { Recorder, resolveVoice, speak, useMicLevel, useVoices } from "@/lib/client/audio";
import { deleteAudio } from "@/lib/client/db";
import { TOPICS, topicById } from "@/lib/content/topics";
import type { Session } from "@/lib/domain/session";
import { useAttempts } from "@/lib/domain/useAttempts";
import { localDocs } from "@/lib/docs/local";
import { loadRecording } from "@/lib/docs/sync";
import { useDocList } from "@/lib/docs/useDocList";
import { TYPE_LABEL } from "@/lib/exam/compose";
import { newId } from "@/lib/exam/result";
import { formatClock } from "@/lib/metrics";
import { PRACTICE_TYPES, practiceQuestion, typesOf } from "@/lib/practice/questions";
import { requestStructureFeedback } from "@/lib/practice/request";
import { chosenTakes, emptyDrill, FRAME, newTakeId, readyToEvaluate, replaceTake, takeStats, withTake, type FramePart, type PartId, type StructureDrill, type Take } from "@/lib/practice/structure";
import type { ExamQuestion, QuestionType } from "@/lib/types";

type StructureSession = Session & { structure: StructureDrill };

const VERDICT = {
  good: { label: "좋음", tone: "bg-good-soft text-good border-good/30" },
  ok: { label: "보통", tone: "bg-wash text-ink-2 border-line-strong" },
  weak: { label: "부족", tone: "bg-pen-soft text-pen-ink border-pen/30" },
} as const;

/** Plays a take's recording, loading it only when asked. */
function TakePlayer({ audioKey }: { audioKey: string }) {
  const [url, setUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const toggle = async () => {
    if (playing) return ref.current?.pause();
    let u = url;
    if (!u) {
      const blob = await loadRecording(audioKey, "session");
      if (!blob) return;
      u = URL.createObjectURL(blob);
      setUrl(u);
    }
    window.setTimeout(() => void ref.current?.play(), 0);
  };
  return (
    <>
      <audio ref={ref} src={url || undefined} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={playing ? "일시정지" : "녹음 듣기"}
        className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-2 transition-[color,border-color,transform] hover:border-ink hover:text-ink active:scale-95"
      >
        <Icon name={playing ? "pause" : "play"} className="size-3" />
      </button>
    </>
  );
}

function LevelBar({ stream, active }: { stream: MediaStream; active: boolean }) {
  const level = useMicLevel(stream, active);
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-pen transition-[width] duration-75" style={{ width: `${Math.min(100, level * 140)}%` }} />
    </div>
  );
}

/** One part of the frame: its guide, the record button, and every take recorded so far. */
function PartCard({
  index,
  part,
  drill,
  sessionId,
  stream,
  busyElsewhere,
  onBusy,
  onTake,
  onChoose,
  onDelete,
}: {
  index: number;
  part: FramePart;
  drill: StructureDrill;
  sessionId: string;
  stream: MediaStream;
  busyElsewhere: boolean;
  onBusy: (busy: boolean) => void;
  /** `added`: a new take; otherwise the transcript (or error) for one that may have been deleted meanwhile. */
  onTake: (t: Take, added: boolean) => void;
  onChoose: (id: string) => void;
  onDelete: (t: Take) => void;
}) {
  const takes = drill.parts[part.id] ?? [];
  const chosen = chosenTakes(drill)[part.id];
  const [recording, setRecording] = useState(false);
  const [since, setSince] = useState(0);
  const [now, setNow] = useState(0);
  const [showFrames, setShowFrames] = useState(false);
  const recorder = useRef<Recorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [recording]);
  // Leaving mid-recording (another question, another page): drop it and free the other parts' buttons.
  useEffect(
    () => () => {
      if (!recorder.current) return;
      recorder.current.discard();
      onBusy(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- on unmount only
    [],
  );

  const start = () => {
    const r = new Recorder(stream);
    recorder.current = r;
    r.start();
    setSince(Date.now());
    setNow(Date.now());
    setRecording(true);
    onBusy(true);
  };

  const stop = async () => {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    setRecording(false);
    onBusy(false);
    const rec = await r.stop();
    const id = newTakeId(part.id);
    const base: Take = { id, audioKey: `${sessionId}:${id}`, mimeType: rec.mimeType, durationMs: rec.durationMs, createdAt: Date.now() };
    onTake(base, true);
    onChoose(id);
    try {
      const { transcript } = await keepAndTranscribe(rec, base.audioKey);
      onTake({ ...base, transcript }, false);
    } catch (e) {
      onTake({ ...base, error: (e as Error).message }, false);
    }
  };

  const done = Boolean(chosen?.transcript?.text.trim());

  return (
    <li className="relative pl-12">
      <span
        className={`absolute left-0 top-0 flex size-9 items-center justify-center rounded-full border text-[14px] font-semibold tabular transition-colors duration-200 ${
          done ? "border-primary bg-primary text-primary-ink" : "border-line-strong bg-surface text-ink-2"
        }`}
      >
        {done ? <Icon name="check" className="size-4" /> : index + 1}
      </span>
      <div className={`rounded-panel border bg-surface px-5 py-5 shadow-panel transition-colors duration-200 ${recording ? "border-pen/60" : "border-line"}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-[17px] font-semibold">
            {part.title} <span className="text-[14px] font-medium text-ink-3">· {part.label}</span>
          </h3>
          <span className="text-[12px] text-ink-3 tabular">
            목표 {part.targetSeconds[0]}~{part.targetSeconds[1]}초
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{part.hint}</p>
        <button type="button" onClick={() => setShowFrames((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
          <Icon name="chevron" className={`size-3.5 transition-transform duration-200 ${showFrames ? "rotate-90" : ""}`} />
          쓸 만한 틀
        </button>
        {showFrames && (
          <ul className="rise mt-2 flex flex-col gap-1 rounded-ctl bg-wash px-4 py-3" lang="en">
            {part.frames.map((f) => (
              <li key={f} className="text-[14px] text-ink">
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {recording ? (
            <>
              <Button onClick={() => void stop()}>
                <Icon name="stop" className="size-3.5" />
                녹음 끝내기
              </Button>
              <span className="inline-flex items-center gap-2 text-[14px] text-ink tabular">
                <span className="size-2 animate-pulse rounded-full bg-pen" />
                {formatClock((now - since) / 1000)}
              </span>
              <LevelBar stream={stream} active />
            </>
          ) : (
            <Button variant={takes.length ? "secondary" : "primary"} onClick={start} disabled={busyElsewhere}>
              <Icon name="mic" className="size-4" />
              {takes.length ? "다시 녹음" : "녹음"}
            </Button>
          )}
        </div>

        {takes.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
            {takes.map((t, i) => {
              const on = chosen?.id === t.id;
              const stats = takeStats(t);
              return (
                <li
                  key={t.id}
                  className={`pop flex items-start gap-3 rounded-ctl border px-3 py-3 transition-colors duration-150 ${on ? "border-ink bg-surface" : "border-transparent bg-wash"}`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${i + 1}번째 녹음 쓰기`}
                    onClick={() => onChoose(t.id)}
                    className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${on ? "border-ink" : "border-line-strong hover:border-ink-3"}`}
                  >
                    {on && <span className="size-2 rounded-full bg-ink" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-ink-3 tabular">
                      {i + 1}번째 · {stats.seconds.toFixed(1)}초{t.transcript ? ` · ${stats.words}단어` : ""}
                    </p>
                    <p className="mt-0.5 text-[15px] leading-relaxed text-ink" lang="en">
                      {t.transcript ? t.transcript.text || "(들리지 않음)" : t.error ? <span className="text-pen-ink">{t.error}</span> : <span className="inline-flex items-center gap-2 text-ink-3"><Spinner className="size-3.5" />받아쓰는 중</span>}
                    </p>
                  </div>
                  <TakePlayer audioKey={t.audioKey} />
                  <button
                    type="button"
                    onClick={() => onDelete(t)}
                    aria-label={`${i + 1}번째 녹음 지우기`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-pen-soft hover:text-pen-ink"
                  >
                    <Icon name="trash" className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </li>
  );
}

function Result({ drill }: { drill: StructureDrill }) {
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  const fb = drill.feedback!;
  const chosen = chosenTakes(drill);
  return (
    <section id="structure-result" className="rise mt-14 border-t border-line pt-8">
      <h2 className="text-[20px] font-bold tracking-[-0.01em]">평가</h2>
      <p className="mt-3 text-[16px] leading-[1.75] text-ink">{fb.overall}</p>
      <ol className="mt-6 flex flex-col gap-3">
        {FRAME.map((p) => {
          const f = fb.parts.find((x) => x.part === p.id);
          const t = chosen[p.id];
          if (!f) return null;
          const s = t ? takeStats(t) : null;
          return (
            <li key={p.id} className="rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[16px] font-semibold">{p.title}</span>
                <span className={`rounded-full border px-3 py-1 text-[13px] font-semibold ${VERDICT[f.verdict].tone}`}>{VERDICT[f.verdict].label}</span>
              </div>
              {s && (
                <p className="mt-1 text-[12px] text-ink-3 tabular">
                  {s.seconds.toFixed(1)}초 · {s.words}단어 (목표 {p.targetSeconds[0]}~{p.targetSeconds[1]}초)
                </p>
              )}
              <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
                <b className="font-semibold text-ink">길이</b> {f.length}
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-ink-2">
                <b className="font-semibold text-ink">내용</b> {f.content}
              </p>
              <p className="mt-3 flex items-start gap-2 rounded-ctl bg-wash px-3 py-2 text-[15px] leading-relaxed text-ink" lang="en">
                <span className="min-w-0 flex-1">{f.better}</span>
                <button type="button" onClick={() => speak(f.better, voice)} aria-label="들어보기" className="mt-0.5 shrink-0 text-ink-2 hover:text-ink">
                  <Icon name="speaker" className="size-4" />
                </button>
              </p>
            </li>
          );
        })}
      </ol>
      <div className="mt-6 rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
        <p className="text-[14px] font-semibold text-ink">흐름</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{fb.flow}</p>
      </div>
      <div className="mt-3 rounded-panel border border-line bg-surface px-5 py-4 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[14px] font-semibold text-ink">네 단계를 이은 모범 답안</p>
          <Button variant="secondary" onClick={() => speak(fb.model_answer, voice)}>
            <Icon name="speaker" className="size-4" />
            들어보기
          </Button>
        </div>
        <p className="mt-3 text-[16px] leading-[1.8] text-ink" lang="en">
          {fb.model_answer}
        </p>
      </div>
    </section>
  );
}

/** 문장 구조화 연습: choose a question, answer it in four separately recorded parts, have it judged as one. */
export function StructureApp() {
  const config = useConfig();
  const toast = useToast();
  const { level } = useAttempts();
  const docs = useDocList<StructureSession>("session");
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);
  const [type, setType] = useState<QuestionType>("describe");
  const [topicId, setTopicId] = useState<string>("");
  const [question, setQuestion] = useState<ExamQuestion | null>(null);
  const [session, setSession] = useState<StructureSession | null>(null);
  const latest = useRef<StructureSession | null>(null);
  const behind = useRef<Promise<void>>(Promise.resolve());
  const [recordingPart, setRecordingPart] = useState<PartId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const topicsForType = TOPICS.filter((t) => typesOf(t).includes(type));

  const begin = (q: ExamQuestion) => {
    const s: StructureSession = {
      id: newId(),
      kind: "structure",
      createdAt: Date.now(),
      title: `${TYPE_LABEL[q.type]} · ${q.topicLabel}`,
      settings: { type: q.type, topicId: q.topicId },
      attempts: [],
      structure: emptyDrill(),
    };
    latest.current = s;
    setSession(s);
    setQuestion(q);
    setRecordingPart(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // A write that finishes after the learner moved to another question (a transcript, feedback) goes to the
  // session it belongs to, read back from this browser, not to the one on screen.
  const update = async (id: string, change: (d: StructureDrill) => StructureDrill) => {
    const cur = latest.current;
    if (cur?.id === id) {
      const next = { ...cur, structure: change(cur.structure) };
      latest.current = next;
      setSession(next);
      await docs.save(id, next);
      return;
    }
    // One at a time, so two late transcripts do not each read the copy without the other.
    const run = behind.current.then(async () => {
      const stored = (await localDocs.get<StructureSession>("session", id).catch(() => undefined))?.data;
      if (stored?.structure) await docs.save(id, { ...stored, structure: change(stored.structure) });
    });
    behind.current = run.catch(() => {});
    await run;
  };

  const evaluate = async () => {
    const cur = latest.current;
    if (!cur || !question) return;
    setBusy(true);
    setError("");
    try {
      const available = config.models.filter((m) => m.available).map((m) => m.id);
      const { feedback, modelId } = await requestStructureFeedback({ ref: cur.id, question, drill: cur.structure, level, available });
      void update(cur.id, (d) => ({ ...d, feedback, modelId }));
      toast("평가를 마쳤습니다");
      window.setTimeout(() => document.getElementById("structure-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (question && session) {
    const drill = session.structure;
    const recorded = FRAME.filter((p) => chosenTakes(drill)[p.id]?.transcript?.text.trim()).length;
    const ready = readyToEvaluate(drill);
    return (
      <AppShell>
        <Page>
          <PageHead
            title="문장 구조화 연습"
            lead="네 단계를 하나씩 따로 녹음하세요. 같은 단계를 몇 번이고 다시 녹음하고, 마음에 드는 녹음을 고를 수 있습니다."
            back={<BackButton onClick={() => (setQuestion(null), setSession(null), setRecordingPart(null))}>유형·주제 다시 고르기</BackButton>}
          />

          <div className="rise mt-8 rounded-panel border border-line bg-surface px-6 py-6 shadow-panel">
            <p className="text-[13px] text-ink-3">
              {TYPE_LABEL[question.type]} · {question.topicLabel}
            </p>
            <p className="mt-2 text-[18px] font-medium leading-[1.6] text-ink" lang="en">
              {question.text}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => speak(question.text, voice)}>
                <Icon name="speaker" className="size-4" />
                질문 듣기
              </Button>
              <Button variant="quiet" onClick={() => begin(practiceQuestion({ type: question.type, topicId: topicId || undefined, avoid: question.text }))}>
                <Icon name="replay" className="size-4" />
                다른 질문
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <MicGate>
              {(stream) => (
                <ol className="relative flex flex-col gap-5 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-line">
                  {FRAME.map((p, i) => (
                    <PartCard
                      key={`${session.id}:${p.id}`}
                      index={i}
                      part={p}
                      drill={drill}
                      sessionId={session.id}
                      stream={stream}
                      busyElsewhere={recordingPart !== null && recordingPart !== p.id}
                      onBusy={(b) => setRecordingPart(b ? p.id : null)}
                      onTake={(t, added) => void update(session.id, (d) => (added ? withTake : replaceTake)(d, p.id, t))}
                      onChoose={(id) => void update(session.id, (d) => ({ ...d, chosen: { ...d.chosen, [p.id]: id } }))}
                      onDelete={(t) => {
                        void deleteAudio(t.audioKey).catch(() => {});
                        void update(session.id, (d) => {
                          const parts = { ...d.parts, [p.id]: d.parts[p.id].filter((x) => x.id !== t.id) };
                          const chosen = { ...d.chosen };
                          if (chosen[p.id] === t.id) delete chosen[p.id];
                          return { ...d, parts, chosen };
                        });
                        toast("녹음을 지웠습니다", "info");
                      }}
                    />
                  ))}
                </ol>
              )}
            </MicGate>
          </div>

          <div className="sticky bottom-4 z-10 mt-8 flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-surface/95 px-5 py-4 shadow-panel backdrop-blur">
            <div className="min-w-[160px] flex-1">
              <p className="text-[14px] font-semibold text-ink tabular">{recorded}/4 단계 녹음</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${(recorded / 4) * 100}%` }} />
              </div>
            </div>
            <Button size="lg" onClick={() => void evaluate()} disabled={!ready || busy || recordingPart !== null}>
              {busy ? <Spinner /> : <Icon name="sparkle" className="size-4" />}
              {drill.feedback ? "다시 평가" : "평가"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-panel border border-pen/30 bg-pen-soft px-5 py-4 text-[15px] leading-relaxed text-pen-ink">
              {error}
            </p>
          )}

          {drill.feedback && <Result drill={drill} />}
        </Page>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Page>
        <PageHead
          title="문장 구조화 연습"
          lead="두괄식 → 이유 → 예시 → 감정·생각. 질문 하나를 네 단계로 나눠 한 단계씩 말하고, 다 말하면 AI가 단계마다 길이와 내용을 함께 평가합니다."
        />

        <Block title="문제 유형">
          <div className="flex flex-wrap gap-2">
            {PRACTICE_TYPES.map((t) => (
              <Chip key={t} on={type === t} onClick={() => (setType(t), setTopicId(""))}>
                {TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Block>

        <Block title="주제" aside={topicId ? topicById(topicId)?.label : "아무 주제"}>
          <div className="flex flex-wrap gap-2">
            <Chip on={!topicId} onClick={() => setTopicId("")}>
              아무 주제
            </Chip>
            {topicsForType.map((t) => (
              <Chip key={t.id} on={topicId === t.id} onClick={() => setTopicId(t.id)}>
                {t.label}
              </Chip>
            ))}
          </div>
        </Block>

        <div className="sticky bottom-4 z-10 mt-10 flex justify-end">
          <Button size="lg" onClick={() => begin(practiceQuestion({ type, topicId: topicId || undefined }))}>
            질문 받기
            <Icon name="arrow" className="size-4" />
          </Button>
        </div>

        <Block title="지난 기록" aside="서비스 준비 중">
          <p className="rounded-panel border border-dashed border-line-strong px-5 py-6 text-center text-[14px] leading-relaxed text-ink-3">
            지난 구조화 연습을 다시 불러오는 기능을 준비하고 있습니다. 연습한 내용은 지금도 저장되고 있어, 기능이 열리면 그대로 볼 수 있습니다.
          </p>
        </Block>
      </Page>
    </AppShell>
  );
}
