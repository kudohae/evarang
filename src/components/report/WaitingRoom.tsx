"use client";

import { Button, Icon, Spinner } from "@/components/ui";
import { countMarks, markDisfluencies, type MarkedWord } from "@/lib/disfluency";
import type { Progress } from "@/lib/client/evaluate";
import type { ExamResult } from "@/lib/exam/result";
import { TYPE_LABEL } from "@/lib/exam/compose";
import { GRADES, type Grade } from "@/lib/types";

const MARK_STYLE = {
  filler: "text-ink-3",
  repeat: "underline decoration-pen/70 decoration-wavy decoration-[1.5px] underline-offset-[5px]",
  cutoff: "underline decoration-pen/70 decoration-wavy decoration-[1.5px] underline-offset-[5px]",
} as const;

function Spoken({ marked }: { marked: MarkedWord[] }) {
  return (
    <p className="text-[16px] leading-[1.95]" lang="en">
      {marked.map((w, i) => (
        <span key={i}>
          {w.pauseBefore !== null && (
            <span className="tabular mx-0.5 whitespace-nowrap text-[13px] text-ink-3" lang="ko">
              ({w.pauseBefore.toFixed(1)}초)
            </span>
          )}
          <span className={w.mark ? MARK_STYLE[w.mark] : undefined}>{w.text}</span>{" "}
        </span>
      ))}
    </p>
  );
}

/** Shown while the evaluation runs: ask for the real grade once, then let the candidate reread what they said. */
export function WaitingRoom({
  result,
  progress,
  done,
  modelLabel,
  onActualGrade,
  onOpenReport,
}: {
  result: ExamResult;
  progress: Progress;
  done: boolean;
  modelLabel: string;
  onActualGrade: (g: Grade | "none") => void;
  onOpenReport: () => void;
}) {
  const total = progress.batches + 1;
  const finished = progress.batchesDone + (progress.overall === "pending" ? 0 : 1);
  const asking = result.actualGrade === undefined;

  const answers = result.questions
    .map((q) => ({ q, a: result.answers.find((x) => x.number === q.number) }))
    .filter((x) => x.a?.transcript);
  const marked = answers.map(({ q, a }) => ({ q, a: a!, marked: markDisfluencies(a!.transcript!.words) }));
  const totals = marked.reduce(
    (s, m) => {
      const c = countMarks(m.marked);
      return { fillers: s.fillers + c.fillers, repeats: s.repeats + c.repeats, pauses: s.pauses + c.pauses };
    },
    { fillers: 0, repeats: 0, pauses: 0 },
  );
  const estimated = result.answers.some((a) => a.transcript?.approxTiming);

  return (
    <>
      {/* Progress stays in view the whole time; it turns into the way out when the report is ready. */}
      <div className="no-print sticky top-0 z-10 border-b border-line bg-paper/94 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between gap-4 px-5">
          {done ? (
            <>
              <p className="text-[15px] font-semibold">평가가 끝났습니다</p>
              <Button onClick={onOpenReport}>
                보고서 보기
                <Icon name="arrow" className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3 text-[14px] text-ink-2">
                <Spinner className="size-4 shrink-0" />
                <span className="truncate">
                  {modelLabel}가 평가하는 중 · 1~3분
                </span>
              </div>
              <div className="h-1 w-28 shrink-0 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-ink transition-[width] duration-700" style={{ width: `${Math.max(6, (finished / total) * 100)}%` }} />
              </div>
            </>
          )}
        </div>
      </div>

      <main key={asking ? "ask" : "read"} className="rise mx-auto max-w-[720px] px-5 pb-28 pt-12">
        {asking ? (
          <section>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">실제 OPIc 등급이 있나요?</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              가장 최근에 받은 등급을 골라 주세요. 예상 등급이 실제와 얼마나 맞는지 확인하는 데만 쓰고, 이번 평가에는 알려주지 않습니다.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onActualGrade(g)}
                  className="tabular h-12 rounded-ctl border border-line-strong bg-surface text-[15px] font-semibold transition-colors hover:border-ink"
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onActualGrade("none")}
              className="mt-4 h-12 w-full rounded-ctl border border-line-strong bg-surface text-[15px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink"
            >
              OPIc을 본 적이 없습니다
            </button>
          </section>
        ) : (
          <section>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">기다리는 동안 내 답변을 읽어보세요</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">말한 그대로 받아쓴 글입니다. 머뭇거리거나 더듬은 곳을 표시했습니다.</p>

            <dl className="mt-7 grid grid-cols-3 gap-4 border-y border-line py-5">
              {(
                [
                  ["군말", totals.fillers, <span key="f" className="text-ink-3" lang="en">um, uh</span>],
                  ["되풀이·끊김", totals.repeats, <span key="r" className={MARK_STYLE.repeat} lang="en">I I went</span>],
                  ["2초 이상 멈춤", totals.pauses, <span key="p" className="text-ink-3">(2.4초)</span>],
                ] as const
              ).map(([label, n, sample]) => (
                <div key={label}>
                  <dt className="text-[13px] text-ink-2">{label}</dt>
                  <dd className="tabular mt-1 text-[24px] font-semibold tracking-[-0.02em]">{n}</dd>
                  <dd className="mt-0.5 text-[13px]">{sample}</dd>
                </div>
              ))}
            </dl>
            {estimated && <p className="mt-3 text-[13px] text-ink-3">보조 음성인식으로 받아쓴 답변은 멈춘 위치가 추정치입니다.</p>}

            <ol className="mt-10 flex flex-col gap-12">
              {marked.map(({ q, marked: m }) => {
                const c = countMarks(m);
                return (
                  <li key={q.number}>
                    <p className="text-[13px] text-ink-3">
                      {q.number}번 · {TYPE_LABEL[q.type]} · {q.topicLabel}
                    </p>
                    <p className="mt-1.5 text-[15px] font-medium leading-[1.6]" lang="en">
                      {q.text}
                    </p>
                    <div className="mt-4 border-l-2 border-line pl-4">
                      {m.length ? <Spoken marked={m} /> : <p className="text-[15px] text-ink-3">녹음된 말이 없습니다.</p>}
                    </div>
                    {m.length > 0 && (
                      <p className="tabular mt-2 pl-4 text-[13px] text-ink-3">
                        군말 {c.fillers} · 되풀이·끊김 {c.repeats} · 멈춤 {c.pauses}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            {done && (
              <div className="mt-14 flex justify-center">
                <Button size="lg" onClick={onOpenReport}>
                  보고서 보기
                  <Icon name="arrow" className="size-4" />
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}
