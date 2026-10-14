"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ChoiceRow, Icon, Spinner, Wordmark } from "@/components/ui";
import { Frame } from "@/components/exam/Frame";
import { Consent, type ConsentAnswers } from "@/components/exam/Consent";
import { newSecret } from "@/lib/client/research";
import { FallbackNotice } from "@/components/FallbackNotice";
import { AnswerStage } from "@/components/exam/QuestionStage";
import { SelfAssessment } from "@/components/exam/SelfAssessment";
import { Setup } from "@/components/exam/Setup";
import { EMPTY_SURVEY, Survey } from "@/components/exam/Survey";
import { resolveVoice, useVoices, type Recording } from "@/lib/client/audio";
import { EXAM_POLICY } from "@/lib/capture/policy";
import { keepAndTranscribe } from "@/lib/capture/pipeline";
import { useMicrophone } from "@/lib/capture/useMicrophone";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { scheduleSync } from "@/lib/docs/sync";
import { useConfig } from "@/components/AccessGate";
import { SAMPLE_QUESTION } from "@/lib/content/levels";
import { adjustLevel, composeSession1, composeSession2, questionCount } from "@/lib/exam/compose";
import { CONSENT_VERSION, newId, type ExamResult } from "@/lib/exam/result";
import { formatClock } from "@/lib/metrics";
import type { Adjustment, AnswerRecord, ExamQuestion, FallbackReason, Level, SurveyAnswers } from "@/lib/types";

const TEST_MS = 40 * 60 * 1000;
const SESSION1_LAST = 7;

type Step = "overview" | "consent" | "survey" | "self" | "setup" | "sample" | "begin" | "question" | "adjust" | "finish";

type Pending = Record<number, "uploading" | "done" | "error">;

function TestHeader({ number, total, deadline }: { number: number; total: number; deadline: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, (deadline - now) / 1000);
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-5">
        <Wordmark />
        <div className="flex items-center gap-6 text-[14px]">
          <span className="tabular text-ink-2">
            문항 <span className="font-semibold text-ink">{number}</span> / {total}
          </span>
          <span className={`tabular ${left < 300 ? "font-semibold text-pen-ink" : "text-ink-2"}`}>남은 시간 {formatClock(left)}</span>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1040px] gap-1 px-5 pb-3" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${i < number - 1 ? "bg-ink" : i === number - 1 ? "bg-ink/40" : "bg-line"}`} />
        ))}
      </div>
    </header>
  );
}

export function ExamApp() {
  const router = useRouter();
  const config = useConfig();
  const voices = useVoices();
  const voice = useMemo(() => resolveVoice(voices), [voices]);

  const [step, setStep] = useState<Step>("overview");
  const [consent, setConsent] = useState<ConsentAnswers>({ transfer: false, age: false, research: false });
  const [surveyPage, setSurveyPage] = useState(0);
  const [survey, setSurvey] = useState<SurveyAnswers>(EMPTY_SURVEY);
  const [startLevel, setStartLevel] = useState<Level | null>(null);
  const mic = useMicrophone();
  const stream = mic.stream;
  const [sampleDone, setSampleDone] = useState(false);
  const [sampleKey, setSampleKey] = useState(0);

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [usedTopics, setUsedTopics] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [finalLevel, setFinalLevel] = useState<Level | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [pending, setPending] = useState<Pending>({});
  const blobs = useRef(new Map<number, Recording>());
  // The fallback notice appears at most once: in setup, or after the test if credit ran out mid-way. Never during a question.
  const fallbackSeen = useRef(false);
  const [pendingNotice, setPendingNotice] = useState<FallbackReason | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const examId = useRef(newId());
  const createdAt = useRef(Date.now());
  const saved = useRef(false);

  // Leaving mid-test loses the session; ask first.
  useEffect(() => {
    if (step !== "question" && step !== "adjust") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [step]);

  const total = finalLevel ? questionCount(finalLevel) : startLevel ? questionCount(startLevel) : 15;

  const runTranscription = useCallback(async (number: number) => {
    const rec = blobs.current.get(number);
    if (!rec) return;
    setPending((p) => ({ ...p, [number]: "uploading" }));
    try {
      const { transcript, fallback } = await keepAndTranscribe(rec, `${examId.current}:${number}`);
      if (fallback && !fallbackSeen.current) {
        fallbackSeen.current = true;
        setPendingNotice(fallback);
      }
      setAnswers((list) => list.map((a) => (a.number === number ? { ...a, transcript, transcriptError: undefined } : a)));
      setPending((p) => ({ ...p, [number]: "done" }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setAnswers((list) => list.map((a) => (a.number === number ? { ...a, transcriptError: msg } : a)));
      setPending((p) => ({ ...p, [number]: "error" }));
    }
  }, []);

  const beginTest = () => {
    if (!startLevel) return;
    const s1 = composeSession1(survey, startLevel);
    setQuestions(s1.questions);
    setUsedTopics(s1.usedTopics);
    setIndex(0);
    setDeadline(Date.now() + TEST_MS);
    setStep("question");
  };

  const finish = (outOfTime: boolean) => {
    setTimedOut(outOfTime);
    setStep("finish");
  };

  useEffect(() => {
    if (step === "finish" && pendingNotice) setNoticeOpen(true);
  }, [step, pendingNotice]);

  const onAnswer = async (rec: Recording, replayed: boolean) => {
    const q = questions[index];
    const audioKey = `${examId.current}:${q.number}`;
    blobs.current.set(q.number, rec);
    setAnswers((list) => [
      ...list.filter((a) => a.number !== q.number),
      { number: q.number, audioKey, mimeType: rec.mimeType, durationMs: rec.durationMs, replayed },
    ]);
    void runTranscription(q.number);

    const outOfTime = Date.now() >= deadline;
    if (outOfTime) return finish(true);
    if (q.number === SESSION1_LAST) return setStep("adjust");
    if (index + 1 >= questions.length) return finish(false);
    setIndex(index + 1);
  };

  const continueAfterAdjust = () => {
    if (!startLevel || !adjustment) return;
    const level = adjustLevel(startLevel, adjustment);
    setFinalLevel(level);
    const s2 = composeSession2(survey, level, usedTopics);
    setQuestions((qs) => [...qs.slice(0, SESSION1_LAST), ...s2]);
    setIndex(SESSION1_LAST);
    setStep("question");
  };

  // Save once every transcription has settled, then hand over to the report.
  const settled = step === "finish" && answers.length > 0 && answers.every((a) => pending[a.number] === "done" || pending[a.number] === "error");
  const failed = answers.filter((a) => pending[a.number] === "error");

  const save = useCallback(async () => {
    if (saved.current || !startLevel) return;
    saved.current = true;
    const answered = new Set(answers.map((a) => a.number));
    const result: ExamResult = {
      id: examId.current,
      createdAt: createdAt.current,
      finishedAt: Date.now(),
      timedOut,
      survey,
      startLevel,
      adjustment: adjustment ?? "same",
      finalLevel: finalLevel ?? startLevel,
      questions: questions.filter((q) => answered.has(q.number)),
      answers: [...answers].sort((a, b) => a.number - b.number),
      evaluations: [],
      consent: { version: CONSENT_VERSION, research: consent.research, at: createdAt.current },
      ...(consent.research ? { research: { secret: newSecret(), uploaded: [] } } : {}),
    };
    await localDocs.put("exam", result.id, result);
    if (syncEnabled(config.user)) scheduleSync("exam", result.id, undefined, { audio: config.storage?.blob !== false });
    router.replace(`/results/${result.id}`);
  }, [adjustment, answers, config.storage, config.user, consent.research, finalLevel, questions, router, startLevel, survey, timedOut]);

  useEffect(() => {
    if (settled && failed.length === 0 && !noticeOpen) void save();
  }, [settled, failed.length, noticeOpen, save]);

  // ── Screens ───────────────────────────────────────────

  if (step === "overview") {
    return (
      <Frame
        step={null}
        title="오리엔테이션"
        lead="실제 OPIc과 같은 순서로 진행합니다. 시작하면 중간에 멈출 수 없으니 조용한 곳에서 이어폰이나 스피커를 준비하세요."
        actions={
          <Button onClick={() => setStep("consent")}>
            시작
            <Icon name="arrow" className="size-4" />
          </Button>
        }
        aside="약 60분"
      >
        <ol className="flex flex-col">
          {[
            ["Background Survey", "직업, 거주 형태, 여가 활동을 묻습니다. 여기서 고른 주제로 문항이 나옵니다."],
            ["Self Assessment", "여섯 단계 중 본인 수준을 고릅니다. 문항의 난이도와 개수가 정해집니다."],
            ["Pre-Test Setup", "질문 음성과 마이크를 점검합니다."],
            ["Sample Question", "점수와 무관한 문항으로 답하는 방법을 연습합니다."],
            ["본 시험 · 40분", "12~15문항. 7번 문항 뒤에 난이도를 한 번 다시 고릅니다."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-5 border-t border-line py-5 first:border-t-0 first:pt-0">
              <span className="tabular w-5 shrink-0 pt-px text-[15px] text-ink-3">{i + 1}</span>
              <div>
                <p className="text-[16px] font-semibold">{t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </Frame>
    );
  }

  if (step === "consent") {
    return <Consent value={consent} onChange={setConsent} onBack={() => setStep("overview")} onNext={() => setStep("survey")} />;
  }

  if (step === "survey") {
    return (
      <Survey
        page={surveyPage}
        answers={survey}
        onChange={setSurvey}
        onBack={() => (surveyPage === 0 ? setStep("consent") : setSurveyPage(surveyPage - 1))}
        onNext={() => (surveyPage === 3 ? setStep("self") : setSurveyPage(surveyPage + 1))}
      />
    );
  }

  if (step === "self") {
    return <SelfAssessment value={startLevel} onChange={setStartLevel} onBack={() => setStep("survey")} onNext={() => setStep("setup")} />;
  }

  if (step === "setup") {
    return <Setup
        stream={stream}
        onConnect={mic.request}
        onFallback={() => (fallbackSeen.current = true)}
        onBack={() => setStep("self")}
        onNext={() => setStep("sample")}
      />;
  }

  if (step === "sample" && stream) {
    return (
      <Frame
        step={3}
        title="Sample Question"
        lead="본 시험과 같은 방식입니다. 질문을 듣고, 녹음이 시작되면 답한 뒤 다음을 누르세요. 이 답변은 저장되지 않습니다."
        aside={sampleDone ? "연습을 마쳤습니다" : "점수와 무관한 연습 문항"}
        actions={
          <>
            {sampleDone && (
              <Button
                variant="quiet"
                onClick={() => {
                  setSampleDone(false);
                  setSampleKey((k) => k + 1);
                }}
              >
                한 번 더
              </Button>
            )}
            <Button onClick={() => setStep("begin")} variant={sampleDone ? "primary" : "secondary"}>
              {sampleDone ? "다음" : "건너뛰기"}
              <Icon name="arrow" className="size-4" />
            </Button>
          </>
        }
      >
        <div className="-mt-4 flex min-h-[420px] flex-col rounded-panel border border-line bg-surface shadow-panel">
          {sampleDone ? (
            <div className="rise flex flex-1 flex-col items-center justify-center px-6 text-center">
              <p className="text-[17px] font-semibold">연습이 끝났습니다.</p>
              <p className="mt-2 max-w-[380px] text-[15px] leading-relaxed text-ink-2">본 시험에서도 질문 글자는 보이지 않습니다. 다시 듣기는 질문이 끝난 뒤 5초 안에 한 번만 쓸 수 있습니다.</p>
            </div>
          ) : (
            <AnswerStage key={sampleKey} voice={voice} stream={stream} text={SAMPLE_QUESTION} policy={EXAM_POLICY} onDone={() => setSampleDone(true)} />
          )}
        </div>
      </Frame>
    );
  }

  if (step === "begin") {
    return (
      <Frame
        step={null}
        title="본 시험을 시작합니다"
        lead="시작을 누르면 40분 타이머가 돌아갑니다."
        aside={startLevel ? `난이도 ${startLevel}단계 · ${questionCount(startLevel)}문항 예정` : undefined}
        actions={
          <>
            <Button variant="quiet" onClick={() => setStep("sample")}>
              <Icon name="back" className="size-4" />
              이전
            </Button>
            <Button onClick={beginTest}>
              시험 시작
              <Icon name="arrow" className="size-4" />
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-4 text-[15px] leading-relaxed">
          <li>질문은 음성으로만 나옵니다. 화면에 글자가 보이지 않습니다.</li>
          <li>질문이 끝나면 바로 녹음이 시작됩니다. 답변 시간 제한은 없습니다.</li>
          <li>다시 듣기는 질문이 끝난 뒤 5초 안에 한 번 쓸 수 있습니다. 다시 들으면 그 전까지의 녹음은 지워집니다.</li>
          <li>지나간 문항으로 돌아갈 수 없습니다. 40분이 지나면 그때까지의 답변으로 시험이 끝납니다.</li>
        </ul>
      </Frame>
    );
  }

  if (step === "question" && stream) {
    const q = questions[index];
    return (
      <div className="flex min-h-dvh flex-col">
        <TestHeader number={q.number} total={total} deadline={deadline} />
        <AnswerStage key={q.number} voice={voice} stream={stream} text={q.text} policy={EXAM_POLICY} deadline={deadline} onDone={onAnswer} />
      </div>
    );
  }

  if (step === "adjust") {
    return (
      <div className="flex min-h-dvh flex-col">
        <TestHeader number={SESSION1_LAST} total={total} deadline={deadline} />
        <main className="rise mx-auto w-full max-w-[560px] flex-1 px-5 pt-16">
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">난이도 재조정</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">지금까지의 질문과 비교해, 남은 질문을 어떻게 받을지 고르세요. 타이머는 계속 흐릅니다.</p>
          <div className="-mx-4 mt-8 flex flex-col gap-0.5">
            {(
              [
                ["easier", "쉬운 질문"],
                ["same", "비슷한 질문"],
                ["harder", "어려운 질문"],
              ] as const
            ).map(([id, label]) => (
              <ChoiceRow key={id} type="radio" checked={adjustment === id} onChange={() => setAdjustment(id)}>
                {label}
              </ChoiceRow>
            ))}
          </div>
          <div className="mt-10 flex justify-end">
            <Button onClick={continueAfterAdjust} disabled={!adjustment}>
              계속
              <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (step === "finish") {
    const done = answers.filter((a) => pending[a.number] === "done").length;
    return (
      <Frame
        step={null}
        title={timedOut ? "시험 시간이 끝났습니다" : "시험이 끝났습니다"}
        lead={
          settled && failed.length > 0
            ? `답변 ${failed.length}개를 받아쓰지 못했습니다. 다시 시도하거나, 그 답변을 빼고 평가로 넘어갈 수 있습니다. 녹음은 남아 있어 평가 화면에서도 다시 받아쓸 수 있습니다.`
            : timedOut
              ? `40분 안에 ${answers.length}개 문항에 답했습니다. 답한 문항까지만 평가합니다.`
              : "답변을 받아쓰는 중입니다. 끝나면 평가 화면으로 넘어갑니다."
        }
        aside={<span className="tabular">받아쓰기 {done} / {answers.length}</span>}
        actions={
          settled && failed.length > 0 ? (
            <>
              <Button variant="quiet" onClick={() => void save()}>
                실패한 문항 빼고 진행
              </Button>
              <Button onClick={() => failed.forEach((a) => void runTranscription(a.number))}>다시 시도</Button>
            </>
          ) : (
            <Spinner className="size-5 text-ink-2" />
          )
        }
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${answers.length ? (done / answers.length) * 100 : 0}%` }} />
        </div>
        {noticeOpen && pendingNotice && (
          <FallbackNotice
            reason={pendingNotice}
            during="after"
            onClose={() => {
              setNoticeOpen(false);
              setPendingNotice(null);
            }}
          />
        )}
        {failed.length > 0 && settled && (
          <div className="mt-8 text-[15px] leading-relaxed">
            <p className="font-semibold">받아쓰지 못한 답변이 있습니다.</p>
            <ul className="mt-2 text-ink-2">
              {failed.map((a) => (
                <li key={a.number}>
                  {a.number}번 — {a.transcriptError}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Frame>
    );
  }

  return null;
}
