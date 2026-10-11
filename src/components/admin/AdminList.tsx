"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { Spinner, Wordmark } from "@/components/ui";
import { modelById } from "@/lib/models";
import { GRADES, type Grade } from "@/lib/types";

type Row = {
  id: string;
  created_at: string;
  expires_at: string;
  start_level: number;
  final_level: number;
  actual_grade: string | null;
  estimated_grade: string | null;
  eval_model: string | null;
  audio_count: number;
};

const step = (g: string | null) => (g ? GRADES.indexOf(g as Grade) : -1);

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-l border-line pl-4 first:border-l-0 first:pl-0">
      <p className="tabular text-[24px] font-semibold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-[13px] text-ink-2">{label}</p>
    </div>
  );
}

export function AdminList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [state, setState] = useState<"loading" | "login" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const res = await fetch("/api/admin/records", { cache: "no-store" });
    if (res.status === 401) return setState("login");
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? `불러오지 못했습니다 (${res.status})`);
      return setState("error");
    }
    setRows(body.records);
    setState("ready");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state === "login") return <AdminLogin onDone={load} />;

  // Calibration: how far the estimate lands from the grade the candidate reported.
  const paired = (rows ?? []).filter((r) => step(r.actual_grade) >= 0 && step(r.estimated_grade) >= 0);
  const diffs = paired.map((r) => step(r.estimated_grade) - step(r.actual_grade));
  const pct = (n: number) => (paired.length ? `${Math.round((n / paired.length) * 100)}%` : "—");
  const mean = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between px-5">
          <Wordmark />
          <span className="text-[14px] text-ink-2">관리자</span>
        </div>
      </header>
      <main className="mx-auto max-w-[1040px] px-5 pb-24 pt-10">
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">저장된 기록</h1>
        {state === "loading" && (
          <div className="mt-16 flex justify-center text-ink-3">
            <Spinner className="size-5" />
          </div>
        )}
        {state === "error" && <p className="mt-6 text-[15px] text-pen-ink">{error}</p>}
        {state === "ready" && rows && (
          <>
            <section className="mt-8">
              <h2 className="text-[15px] font-semibold text-ink-2">예상 등급과 실제 등급</h2>
              <div className="mt-4 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
                <Stat value={String(paired.length)} label={`비교 가능한 기록 / 전체 ${rows.length}`} />
                <Stat value={pct(diffs.filter((d) => d === 0).length)} label="정확히 일치" />
                <Stat value={pct(diffs.filter((d) => Math.abs(d) <= 1).length)} label="한 단계 이내" />
                <Stat value={paired.length ? `${mean > 0 ? "+" : ""}${mean.toFixed(2)}` : "—"} label="평균 차이 (+면 후하게)" />
              </div>
            </section>

            <section className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="text-[13px] text-ink-3">
                  <tr className="border-b border-line">
                    <th className="py-2.5 font-medium">응시일</th>
                    <th className="py-2.5 font-medium">예상</th>
                    <th className="py-2.5 font-medium">실제</th>
                    <th className="py-2.5 font-medium">차이</th>
                    <th className="py-2.5 font-medium">평가 모델</th>
                    <th className="py-2.5 font-medium">난이도</th>
                    <th className="py-2.5 font-medium">녹음</th>
                    <th className="py-2.5 font-medium">삭제 예정</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = step(r.actual_grade) >= 0 && step(r.estimated_grade) >= 0 ? step(r.estimated_grade) - step(r.actual_grade) : null;
                    return (
                      <tr key={r.id} className="border-b border-line hover:bg-wash/60">
                        <td className="py-2.5">
                          <Link href={`/admin/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                            {new Date(r.created_at).toLocaleDateString("ko-KR")}
                          </Link>
                        </td>
                        <td className="tabular py-2.5 font-semibold">{r.estimated_grade ?? "—"}</td>
                        <td className="tabular py-2.5">{r.actual_grade === "none" ? "없음" : r.actual_grade ?? "—"}</td>
                        <td className="tabular py-2.5">{d === null ? "—" : d === 0 ? "0" : d > 0 ? `+${d}` : String(d)}</td>
                        <td className="py-2.5 text-ink-2">{r.eval_model ? modelById(r.eval_model)?.label ?? r.eval_model : "—"}</td>
                        <td className="tabular py-2.5 text-ink-2">
                          {r.start_level}→{r.final_level}
                        </td>
                        <td className="tabular py-2.5 text-ink-2">{r.audio_count}</td>
                        <td className="tabular py-2.5 text-ink-3">{new Date(r.expires_at).toLocaleDateString("ko-KR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <p className="mt-6 text-[15px] text-ink-2">아직 저장된 기록이 없습니다.</p>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
