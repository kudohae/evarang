"use client";

import { useEffect, useRef, useState } from "react";
import { useConfig } from "@/components/AccessGate";
import { Report } from "@/components/report/Report";
import { WaitingRoom } from "@/components/report/WaitingRoom";
import { AppShell } from "@/components/AppShell";
import { Button, Icon, Spinner } from "@/components/ui";
import { evaluate, type Progress } from "@/lib/client/evaluate";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { loadDoc, loadRecording, scheduleSync } from "@/lib/docs/sync";
import { transcribeBlob } from "@/lib/client/transcribe";
import { deleteResearch, researchSignature, syncResearch, wantsResearch } from "@/lib/client/research";
import { FallbackNotice } from "@/components/FallbackNotice";
import type { FallbackReason, Grade } from "@/lib/types";
import type { ExamResult } from "@/lib/exam/result";
import { MODELS, modelLabel } from "@/lib/models";

export function ReportApp({ id }: { id: string }) {
  const config = useConfig();
  const [result, setResult] = useState<ExamResult | null | undefined>(undefined);
  // Evaluation runs in the background while the waiting room asks for the real grade and shows the transcripts.
  const [waiting, setWaiting] = useState<{ progress: Progress; done: boolean } | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [notice, setNotice] = useState<FallbackReason | null>(null);

  // The latest saved result. Writes that finish later (evaluation, grade answer) build on this, never on a stale copy.
  const latest = useRef<ExamResult | null>(null);
  const keepInAccount = syncEnabled(config.user);
  /** `localOnly`: bookkeeping that stays in this browser; the record's version and the account copy are left alone. */
  const save = async (update: (r: ExamResult) => ExamResult, { localOnly = false }: { localOnly?: boolean } = {}) => {
    if (!latest.current) return;
    const changed = update(latest.current);
    const updatedAt = localOnly ? (changed.updatedAt ?? changed.createdAt) : Date.now();
    const next = { ...changed, updatedAt };
    latest.current = next;
    setResult(next);
    await localDocs.put("exam", next.id, next, { updatedAt });
    if (!localOnly && keepInAccount) scheduleSync("exam", next.id, (s) => void adoptNewer(s.pushedVersion), { audio: config.storage?.blob !== false });
  };

  // The account had a newer copy (edited on another device) and it replaced ours: show it and build on it.
  const adoptNewer = async (version: number | undefined) => {
    if (!version || !latest.current || version <= (latest.current.updatedAt ?? 0)) return;
    const doc = await localDocs.get<ExamResult>("exam", latest.current.id).catch(() => undefined);
    if (!doc?.data) return;
    latest.current = { ...doc.data, updatedAt: doc.updatedAt };
    setResult(latest.current);
  };

  const signedIn = Boolean(config.user);
  useEffect(() => {
    void (async () => {
      // Not in this browser: a member may have it in their account; a local copy is kept so edits work as usual.
      const r = (await loadDoc<ExamResult>("exam", id, { account: signedIn }).catch(() => null))?.data ?? null;
      latest.current = r;
      setResult(r);
    })();
  }, [id, signedIn]);

  const run = async () => {
    const current = latest.current;
    if (!current) return;
    setError("");
    const available = config.models.filter((m) => m.available).map((m) => m.id);
    setWaiting({ progress: { modelId: available[0] ?? MODELS[0].id, batchesDone: 0, batches: 1, overall: "pending" }, done: false });
    try {
      const ev = await evaluate(current, available, (progress) => setWaiting((w) => (w ? { ...w, progress } : w)));
      if (!ev.overall && ev.questions.length === 0) throw new Error(ev.errors[0] ?? "평가에 실패했습니다.");
      await save((r) => ({ ...r, evaluations: [...r.evaluations, ev] }));
      setShown(ev.id);
      // Do not pull the reader away from the transcripts; the bar at the top offers the report.
      setWaiting((w) => (w ? { ...w, done: true } : w));
    } catch (e) {
      setError((e as Error).message);
      setWaiting(null);
    }
  };

  // A finished test is graded as soon as its report opens. Tests with untranscribed answers wait, so the candidate can retry those first.
  const started = useRef(false);
  useEffect(() => {
    if (!result || started.current) return;
    started.current = true;
    const ready = result.evaluations.length === 0 && result.answers.some((a) => a.transcript) && result.answers.every((a) => a.transcript);
    if (ready) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Research copy: send whenever its content changes (evaluation, real grade, transcripts). Failures wait for the next change.
  const lastSig = useRef("");
  useEffect(() => {
    if (!result || !wantsResearch(result)) return;
    const sig = researchSignature(result);
    if (sig === lastSig.current) return;
    lastSig.current = sig;
    void syncResearch(result).then((research) => save((r) => ({ ...r, research: { ...research, deleted: r.research?.deleted } }), { localOnly: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const removeResearch = async () => {
    if (!result) return;
    await deleteResearch(result);
    await save((r) => ({ ...r, research: r.research ? { ...r.research, deleted: true } : r.research }), { localOnly: true });
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
        const blob = await loadRecording(a.audioKey);
        if (!blob) throw new Error("녹음 파일이 이 브라우저에 없습니다.");
        const r = await transcribeBlob(blob, a.durationMs, a.audioKey);
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
    // Newly transcribed answers belong in the grade, so an existing report is graded again with them.
    if (result.evaluations.length && answers.some((x, i) => x.transcript && !before[i].transcript)) void run();
  };

  const missing = result ? result.answers.filter((a) => !a.transcript).length : 0;
  const transcribed = result ? result.answers.filter((a) => a.transcript).length : 0;

  if (result === undefined) {
    return (
      <AppShell>
        <div className="flex justify-center pt-32 text-ink-3">
          <Spinner className="size-5" />
        </div>
      </AppShell>
    );
  }

  if (result === null) {
    return (
      <AppShell>
        <main className="mx-auto max-w-[560px] px-5 pt-24">
          <h1 className="text-[22px] font-bold">결과를 찾을 수 없습니다</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {config.user?.recordsConsent
              ? "이 브라우저에도, 계정에도 없는 기록입니다."
              : config.user
                ? "이 브라우저에 없는 기록입니다. 계정에 시험 기록을 저장하도록 켜두면 다른 기기에서도 열 수 있습니다."
                : config.auth
                  ? "이 브라우저에 없는 기록입니다. 계정에 저장한 기록이라면 로그인한 뒤 다시 열어 보세요."
                  : "시험 기록은 응시한 브라우저에만 저장됩니다. 다른 기기나 브라우저에서는 열리지 않습니다."}
          </p>
        </main>
      </AppShell>
    );
  }

  if (waiting) {
    return (
      <AppShell>
        <WaitingRoom
          result={result}
          progress={waiting.progress}
          done={waiting.done}
          modelLabel={modelLabel(waiting.progress.modelId)}
          onActualGrade={answerActualGrade}
          onOpenReport={() => {
            setWaiting(null);
            window.scrollTo(0, 0);
          }}
        />
      </AppShell>
    );
  }

  const evaluation = result.evaluations.find((e) => e.id === shown) ?? result.evaluations[result.evaluations.length - 1];

  if (!evaluation) {
    const empty = transcribed > 0 && result.answers.every((a) => !a.transcript?.text.trim());
    return (
      <AppShell>
        <main className="rise mx-auto max-w-[640px] px-5 pb-24 pt-14">
          <h1 className="text-[26px] font-bold tracking-[-0.02em]">평가 전</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">답변 {transcribed}개를 받아썼습니다.</p>
          {missing > 0 && (
            <div className="mt-6 rounded-panel border border-line bg-surface shadow-panel px-5 py-4">
              <p className="text-[15px] leading-relaxed">
                {transcribed === 0 ? "아직 받아쓴 답변이 없어 평가할 수 없습니다." : `답변 ${missing}개는 받아쓰지 못해 지금 평가하면 빠집니다.`} 녹음은 이 브라우저에 남아 있으니 다시 받아쓸 수 있습니다.
              </p>
              <Button className="mt-3" variant="secondary" onClick={retranscribe} disabled={retrying}>
                {retrying ? <Spinner /> : null}
                {retrying ? "받아쓰는 중" : "다시 받아쓰기"}
              </Button>
            </div>
          )}
          {empty && <p className="mt-4 text-[15px] text-pen-ink">받아쓴 답변이 모두 비어 있습니다. 마이크 입력을 확인한 뒤 다시 응시하는 것이 좋습니다.</p>}
          {error && <p className="mt-6 text-[14px] leading-relaxed text-pen-ink">{error}</p>}
          <div className="mt-10 flex justify-end">
            <Button onClick={run} disabled={transcribed === 0 || retrying}>
              {error ? "다시 시도" : "평가 시작"}
              <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </main>
        {notice && <FallbackNotice reason={notice} during="after" onClose={() => setNotice(null)} />}
      </AppShell>
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
              {modelLabel(e.modelId)} · {new Date(e.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              {e.overall ? ` · ${e.overall.grade}` : ""}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <AppShell>
      <Report
        result={result}
        evaluation={evaluation}
        onReevaluate={run}
        history={history}
        missing={missing}
        onRetranscribe={retranscribe}
        retrying={retrying}
        retryError={error}
        onDeleteResearch={result.consent?.research ? removeResearch : undefined}
      />
      {notice && <FallbackNotice reason={notice} during="after" onClose={() => setNotice(null)} />}
    </AppShell>
  );
}
