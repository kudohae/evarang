"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Report } from "@/components/report/Report";
import { Spinner, Wordmark } from "@/components/ui";
import type { ExamResult } from "@/lib/exam/result";
import { modelById } from "@/lib/models";

export function AdminRecord({ id }: { id: string }) {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [shown, setShown] = useState(0);

  const load = async () => {
    setState("loading");
    const res = await fetch(`/api/admin/records/${id}`, { cache: "no-store" });
    if (res.status === 401) return setState("login");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? `불러오지 못했습니다 (${res.status})`);
      return setState("error");
    }
    const data = body.data as ExamResult;
    const audio = body.audio as Record<string, string>;
    // Recordings come from the private blob store instead of the candidate's browser.
    data.answers = data.answers.map((a) => ({ ...a, audioKey: audio[String(a.number)] ? `remote:${audio[String(a.number)]}` : "" }));
    setResult(data);
    setShown(data.evaluations.length - 1);
    setState("ready");
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (state === "login") return <AdminLogin onDone={load} />;
  const evaluation = result?.evaluations[shown];

  return (
    <div className="min-h-dvh">
      <header className="no-print border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-5">
          <Wordmark />
          <Link href="/admin" className="text-[14px] text-ink-2 hover:text-ink">
            기록 목록
          </Link>
        </div>
      </header>
      {state === "loading" && (
        <div className="flex justify-center pt-32 text-ink-3">
          <Spinner className="size-5" />
        </div>
      )}
      {state === "error" && <p className="mx-auto max-w-[720px] px-5 pt-16 text-[15px] text-pen-ink">{error}</p>}
      {state === "ready" && result && !evaluation && <p className="mx-auto max-w-[720px] px-5 pt-16 text-[15px] text-ink-2">아직 평가 결과가 없는 기록입니다.</p>}
      {state === "ready" && result && evaluation && (
        <Report
          result={result}
          evaluation={evaluation}
          readOnly
          missing={0}
          retrying={false}
          retryError=""
          onRetranscribe={() => {}}
          onReevaluate={() => {}}
          history={
            <p className="mt-3 text-[14px] text-ink-2">
              기록 {result.id} · 실제 등급 {result.actualGrade === "none" ? "응시 경험 없음" : result.actualGrade ?? "미입력"}
              {result.evaluations.length > 1 && (
                <select
                  value={shown}
                  onChange={(e) => setShown(Number(e.target.value))}
                  className="ml-3 h-9 rounded-ctl border border-line-strong bg-surface px-2 text-[14px] text-ink"
                >
                  {result.evaluations.map((e, i) => (
                    <option key={e.id} value={i}>
                      {modelById(e.modelId)?.label ?? e.modelId} · {e.overall?.grade ?? "—"}
                    </option>
                  ))}
                </select>
              )}
            </p>
          }
        />
      )}
    </div>
  );
}
