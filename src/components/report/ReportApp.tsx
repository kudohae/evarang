"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { ModelPicker, preferredModel, rememberModel } from "@/components/report/ModelPicker";
import { Report } from "@/components/report/Report";
import { WaitingRoom } from "@/components/report/WaitingRoom";
import { Button, Icon, Spinner, Wordmark } from "@/components/ui";
import { evaluate, type Progress } from "@/lib/client/evaluate";
import { getAudio, getResult, putResult } from "@/lib/client/db";
import { transcribeBlob } from "@/lib/client/transcribe";
import { FallbackNotice } from "@/components/FallbackNotice";
import type { FallbackReason, Grade } from "@/lib/types";
import type { ExamResult } from "@/lib/exam/result";
import { modelById } from "@/lib/models";

// Backup transcription spends the same Gemini free-tier quota, so evaluation goes to the model with the largest allowance.
const BACKUP_EVAL_MODEL = "gemini-3.5-flash-lite";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-5">
          <Wordmark />
          <Link href="/" className="text-[14px] text-ink-2 hover:text-ink">
            처음으로
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}

export function ReportApp({ id }: { id: string }) {
  const config = useConfig();
  const [result, setResult] = useState<ExamResult | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [model, setModel] = useState("");
  // Evaluation runs in the background while the waiting room asks for the real grade and shows the transcripts.
  const [waiting, setWaiting] = useState<{ progress: Progress; done: boolean } | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<FallbackReason | null>(null);

  // The latest saved result. Writes that finish later (evaluation, grade answer) build on this, never on a stale copy.
  const latest = useRef<ExamResult | null>(null);
  const save = async (update: (r: ExamResult) => ExamResult) => {
    if (!latest.current) return;
    const next = update(latest.current);
    latest.current = next;
    setResult(next);
    await putResult(next.id, next);
  };

  useEffect(() => {
    void getResult<ExamResult>(id).then((r) => {
      latest.current = r ?? null;
      setResult(r ?? null);
    });
  }, [id]);

  const usedBackup = Boolean(result?.answers.some((a) => a.transcript?.engine === "gemini"));
  const loaded = result !== undefined;

  useEffect(() => {
    if (!loaded) return;
    const ids = config.models.filter((m) => m.available).map((m) => m.id);
    if (usedBackup && ids.includes(BACKUP_EVAL_MODEL)) setModel(BACKUP_EVAL_MODEL);
    else setModel((m) => m || (preferredModel(ids) ?? ""));
  }, [config, usedBackup, loaded]);

  const run = async () => {
    if (!result || !model) return;
    // An automatic pick for a backup-transcribed test should not become the default for normal tests.
    if (!usedBackup) rememberModel(model);
    setError("");
    setWaiting({ progress: { batchesDone: 0, batches: 1, overall: "pending" }, done: false });
    try {
      const ev = await evaluate(result, model, (progress) => setWaiting((w) => (w ? { ...w, progress } : w)));
      if (!ev.overall && ev.questions.length === 0) throw new Error(ev.errors[0] ?? "평가에 실패했습니다.");
      await save((r) => ({ ...r, evaluations: [...r.evaluations, ev] }));
      setShown(ev.id);
      setPicking(false);
      // Do not pull the reader away from the transcripts; the bar at the top offers the report.
      setWaiting((w) => (w ? { ...w, done: true } : w));
    } catch (e) {
      setError((e as Error).message);
      setWaiting(null);
    }
  };

  const answerActualGrade = (g: Grade | "none") => void save((r) => ({ ...r, actualGrade: g }));

  /** Re-runs transcription for answers that failed, from the recordings kept in this browser. */
  const retranscribe = async () => {
    if (!result) return;
    setRetrying(true);
    setError("");
    let answers = result.answers;
    let fallback: FallbackReason | undefined;
    const errors: string[] = [];
    for (const a of result.answers.filter((x) => !x.transcript)) {
      try {
        const blob = await getAudio(a.audioKey);
        if (!blob) throw new Error("녹음 파일이 이 브라우저에 없습니다.");
        const r = await transcribeBlob(blob, a.durationMs);
        fallback ??= r.fallback;
        answers = answers.map((x) => (x.number === a.number ? { ...x, transcript: r.transcript, transcriptError: undefined } : x));
      } catch (e) {
        errors.push(`${a.number}번: ${(e as Error).message}`);
        answers = answers.map((x) => (x.number === a.number ? { ...x, transcriptError: (e as Error).message } : x));
      }
    }
    const before = result.answers;
    await save((r) => ({ ...r, answers }));
    setRetrying(false);
    if (errors.length) setError(`다시 받아쓰지 못한 답변이 있습니다. ${errors[0]}`);
    if (fallback) setNotice(fallback);
    if (result.evaluations.length && answers.some((x, i) => x.transcript && !before[i].transcript)) setPicking(true);
  };

  const missing = result ? result.answers.filter((a) => !a.transcript).length : 0;
  const transcribed = result ? result.answers.filter((a) => a.transcript).length : 0;

  if (result === undefined) {
    return (
      <Shell>
        <div className="flex justify-center pt-32 text-ink-3">
          <Spinner className="size-5" />
        </div>
      </Shell>
    );
  }

  if (result === null) {
    return (
      <Shell>
        <main className="mx-auto max-w-[560px] px-5 pt-24">
          <h1 className="text-[22px] font-bold">결과를 찾을 수 없습니다</h1>
          <p className="mt-2 text-[15px] text-ink-2">시험 기록은 응시한 브라우저에만 저장됩니다. 다른 기기나 브라우저에서는 열리지 않습니다.</p>
        </main>
      </Shell>
    );
  }

  if (waiting) {
    return (
      <Shell>
        <WaitingRoom
          result={result}
          progress={waiting.progress}
          done={waiting.done}
          modelLabel={modelById(model)?.label ?? model}
          onActualGrade={answerActualGrade}
          onOpenReport={() => {
            setWaiting(null);
            window.scrollTo(0, 0);
          }}
        />
      </Shell>
    );
  }

  const evaluation = result.evaluations.find((e) => e.id === shown) ?? result.evaluations[result.evaluations.length - 1];

  if (!evaluation || picking) {
    const empty = transcribed > 0 && result.answers.every((a) => !a.transcript?.text.trim());
    return (
      <Shell>
        <main className="rise mx-auto max-w-[640px] px-5 pb-24 pt-14">
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">평가 모델 선택</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            답변 {transcribed}개를 받아썼습니다. 어떤 모델로 평가할지 고르세요. 같은 시험을 나중에 다른 모델로 다시 평가해 비교할 수 있습니다.
          </p>
          {missing > 0 && (
            <div className="mt-6 rounded-panel border border-line bg-surface px-5 py-4">
              <p className="text-[15px] leading-relaxed">
                {transcribed === 0 ? "아직 받아쓴 답변이 없어 평가할 수 없습니다." : `답변 ${missing}개는 받아쓰지 못해 평가에서 빠집니다.`} 녹음은 이 브라우저에 남아 있으니 다시 받아쓸 수 있습니다.
              </p>
              <Button className="mt-3" variant="secondary" onClick={retranscribe} disabled={retrying}>
                {retrying ? <Spinner /> : null}
                {retrying ? "받아쓰는 중" : "다시 받아쓰기"}
              </Button>
            </div>
          )}
          {empty && <p className="mt-4 text-[15px] text-pen-ink">받아쓴 답변이 모두 비어 있습니다. 마이크 입력을 확인한 뒤 다시 응시하는 것이 좋습니다.</p>}
          {usedBackup && model === BACKUP_EVAL_MODEL && (
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
              보조 음성인식으로 받아쓴 시험이라 Gemini 3.5 Flash-Lite를 골라 두었습니다. 받아쓰기와 같은 무료 한도를 쓰기 때문에, 한도가 가장 넉넉한 모델로 평가합니다.
            </p>
          )}
          <div className="mt-8">
            <ModelPicker value={model} onChange={setModel} />
          </div>
          {error && <p className="mt-6 text-[14px] leading-relaxed text-pen-ink">{error}</p>}
          <div className="mt-10 flex items-center justify-end gap-2">
            {evaluation && (
              <Button variant="quiet" onClick={() => setPicking(false)}>
                취소
              </Button>
            )}
            <Button onClick={run} disabled={!model || transcribed === 0 || retrying}>
              평가 시작
              <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </main>
        {notice && <FallbackNotice reason={notice} during="after" onClose={() => setNotice(null)} />}
      </Shell>
    );
  }

  const history =
    result.evaluations.length > 1 ? (
      <label className="no-print mt-3 inline-flex items-center gap-2 text-[14px] text-ink-2">
        평가 기록
        <select
          value={evaluation.id}
          onChange={(e) => setShown(e.target.value)}
          className="h-9 rounded-ctl border border-line-strong bg-surface px-2 text-[14px] text-ink"
        >
          {result.evaluations.map((e) => (
            <option key={e.id} value={e.id}>
              {modelById(e.modelId)?.label ?? e.modelId} · {new Date(e.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              {e.overall ? ` · ${e.overall.grade}` : ""}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <Shell>
      <Report
        result={result}
        evaluation={evaluation}
        onReevaluate={() => setPicking(true)}
        history={history}
        missing={missing}
        onRetranscribe={retranscribe}
        retrying={retrying}
        retryError={error}
      />
      {notice && <FallbackNotice reason={notice} during="after" onClose={() => setNotice(null)} />}
    </Shell>
  );
}
