"use client";

import { useMemo, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { GradeLadder, LengthChart, Meter } from "@/components/report/Figures";
import { QuestionDetail } from "@/components/report/QuestionDetail";
import { GRADE_INFO } from "@/lib/content/levels";
import type { Evaluation, ExamResult } from "@/lib/exam/result";
import { answerMetrics, examMetrics, formatClock } from "@/lib/metrics";
import { estimateCost, modelById, STT_USD_PER_HOUR } from "@/lib/models";

const CRITERIA = {
  functions: { name: "과제 수행", hint: "묘사·서술·문제 해결 같은 과제를 실제로 해내는가" },
  content: { name: "내용", hint: "익숙한 주제를 넘어 구체적이고 관련 있는 내용을 말하는가" },
  accuracy: { name: "정확성", hint: "문법과 어휘가 의미 전달을 방해하지 않는가 (발음 제외)" },
  text_type: { name: "담화 구조", hint: "단어 → 문장 → 문단 중 어디까지 이어 말하는가" },
} as const;

const ADJ = { easier: "쉽게", same: "비슷하게", harder: "어렵게" } as const;

function Section({ id, title, children, sub }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 border-t border-line pt-12 pb-4 first:border-t-0 first:pt-0">
      <h2 className="text-[21px] font-bold tracking-[-0.015em]">{title}</h2>
      {sub && <p className="mt-1.5 text-[14px] text-ink-2">{sub}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="sm:border-l sm:border-line sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
      <p className="tabular text-[26px] font-semibold tracking-[-0.02em]">{value}</p>
      <p className="mt-0.5 text-[13px] text-ink-2">{label}</p>
    </div>
  );
}

export function Report({
  result,
  evaluation,
  onReevaluate,
  history,
  missing,
  onRetranscribe,
  retrying,
  retryError,
}: {
  result: ExamResult;
  evaluation: Evaluation;
  onReevaluate: () => void;
  history: React.ReactNode;
  missing: number;
  onRetranscribe: () => void;
  retrying: boolean;
  retryError: string;
}) {
  const o = evaluation.overall;
  const model = modelById(evaluation.modelId);
  const perAnswer = useMemo(() => result.answers.map((a) => ({ number: a.number, m: answerMetrics(a) })), [result.answers]);
  const totals = examMetrics(perAnswer.filter((x) => x.number !== 1).map((x) => x.m));
  const [current, setCurrent] = useState(result.questions[0]?.number ?? 1);

  const qIndex = result.questions.findIndex((q) => q.number === current);
  const question = result.questions[qIndex];
  const goto = (n: number) => {
    setCurrent(n);
    document.getElementById("answers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const estimated = result.answers.filter((a) => a.transcript?.approxTiming).length;
  const sttSeconds = result.answers.reduce((s, a) => s + (a.transcript?.audioSeconds ?? a.durationMs / 1000), 0);
  const llmCost = model ? estimateCost(model, evaluation.usage) : null;
  const sttCost = (sttSeconds / 3600) * STT_USD_PER_HOUR;

  const toc = [
    ["grade", "예상 등급"],
    ...(o?.to_next.length ? [["next", `${o.next_grade}로 가려면`]] : []),
    ...(o ? [["criteria", "평가 기준"]] : []),
    ["fluency", "말하기 지표"],
    ...(o?.patterns.length ? [["patterns", "반복되는 습관"]] : []),
    ["answers", "문항별 첨삭"],
    ...(o?.plan.length ? [["plan", "다음 시험까지"]] : []),
  ];

  const date = new Date(result.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto grid max-w-[1040px] gap-12 px-5 pb-28 pt-10 lg:grid-cols-[168px_1fr] lg:pt-14">
      <nav className="no-print hidden lg:block">
        <ol className="sticky top-10 flex flex-col gap-2.5 text-[14px]">
          {toc.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-ink-2 transition-colors hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="min-w-0 max-w-[720px]">
        <div className="rise">
          <p className="text-[14px] text-ink-2">
            {date} · 난이도 {result.startLevel}단계에서 {ADJ[result.adjustment]} 조정
            {result.timedOut && " · 시간 초과로 종료"}
          </p>
          {history}
        </div>

        {missing > 0 && (
          <div className="no-print mt-6 rounded-panel border border-line bg-surface px-5 py-4 text-[14px] leading-relaxed">
            <p>답변 {missing}개는 받아쓰지 못해 이 평가에서 빠졌습니다. 다시 받아쓰면 그 답변까지 넣어 다시 평가할 수 있습니다.</p>
            {retryError && <p className="mt-1 text-pen-ink">{retryError}</p>}
            <button type="button" onClick={onRetranscribe} disabled={retrying} className="mt-2 font-semibold underline underline-offset-4 disabled:text-ink-3">
              {retrying ? "받아쓰는 중…" : "다시 받아쓰기"}
            </button>
          </div>
        )}

        {evaluation.errors.length > 0 && (
          <div className="mt-6 rounded-panel border border-pen/30 bg-pen-soft px-5 py-4 text-[14px] leading-relaxed text-pen-ink">
            <p className="font-semibold">평가 일부가 완료되지 않았습니다.</p>
            <ul className="mt-1">
              {evaluation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <button type="button" onClick={onReevaluate} className="mt-2 font-semibold underline underline-offset-4">
              다시 평가하기
            </button>
          </div>
        )}

        <div className="mt-10 flex flex-col">
          <Section id="grade" title="예상 등급">
            {o ? (
              <div className="rise">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                  <p className="text-[88px] font-bold leading-[0.9] tracking-[-0.045em] md:text-[112px]">{o.grade}</p>
                  <div className="pb-2">
                    <p className="text-[17px] font-semibold">{GRADE_INFO[o.grade].name}</p>
                    <p className="text-[14px] text-ink-2">
                      {o.range_low === o.range_high ? "범위 없이 이 등급으로 판단" : `${o.range_low}–${o.range_high} 범위에서 가장 가능성이 높음`}
                    </p>
                  </div>
                </div>
                <div className="mt-8">
                  <GradeLadder grade={o.grade} low={o.range_low} high={o.range_high} />
                </div>
                {result.actualGrade && result.actualGrade !== "none" && (
                  <p className="mt-6 text-[15px] text-ink-2">
                    실제 OPIc 등급은 <span className="font-semibold text-ink">{result.actualGrade}</span>라고 답하셨습니다.
                  </p>
                )}
                <p className="mt-8 text-[17px] leading-[1.8]">{o.verdict}</p>
                <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
                  {o.grade} — {GRADE_INFO[o.grade].summary}
                </p>
              </div>
            ) : (
              <p className="text-[15px] text-ink-2">종합 판정을 받지 못했습니다. 문항별 첨삭은 아래에서 볼 수 있습니다.</p>
            )}
          </Section>

          {o && o.to_next.length > 0 && (
            <Section id="next" title={`${o.next_grade}로 가려면`} sub={`${GRADE_INFO[o.next_grade].name}: ${GRADE_INFO[o.next_grade].summary}`}>
              <ol className="flex flex-col gap-10">
                {o.to_next.map((t, i) => (
                  <li key={i} className="flex gap-5">
                    <span className="tabular w-6 shrink-0 text-[20px] font-bold leading-tight text-ink-3">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[17px] font-semibold leading-snug">{t.title}</p>
                      <p className="mt-2 text-[15px] leading-[1.75] text-ink-2">{t.detail}</p>
                      <div className="mt-4 flex flex-col gap-2 text-[15px] leading-relaxed" lang="en">
                        <p className="text-ink-3">
                          <span className="mr-3 text-[12px] font-semibold tracking-wide text-ink-3" lang="ko">
                            지금
                          </span>
                          {t.before}
                        </p>
                        <p className="text-ink">
                          <span className="mr-3 text-[12px] font-semibold tracking-wide text-pen-ink" lang="ko">
                            다음
                          </span>
                          {t.after}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {o && (
            <Section id="criteria" title="평가 기준" sub="ACTFL 기준 네 가지로 본 결과입니다. 5가 가장 높습니다.">
              <div className="flex flex-col">
                {(Object.keys(CRITERIA) as (keyof typeof CRITERIA)[]).map((key) => {
                  const c = o.criteria.find((x) => x.key === key);
                  if (!c) return null;
                  return (
                    <div key={key} className="border-t border-line py-6 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[16px] font-semibold">{CRITERIA[key].name}</p>
                          <p className="text-[13px] text-ink-3">{CRITERIA[key].hint}</p>
                        </div>
                        <Meter value={c.rating} />
                      </div>
                      <p className="mt-3 text-[15px] leading-[1.75] text-ink-2">{c.comment}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section id="fluency" title="말하기 지표" sub="자기소개를 뺀 답변 기준입니다. 막대를 누르면 그 문항의 첨삭으로 갑니다.">
            <div className="grid grid-cols-2 gap-y-6 sm:grid-cols-4">
              <Figure value={formatClock(totals.totalSeconds)} label="총 답변 시간" />
              <Figure value={formatClock(totals.avgSeconds)} label="평균 답변 길이" />
              <Figure value={String(Math.round(totals.avgWpm))} label="분당 단어 수" />
              <Figure value={totals.fillersPerMin.toFixed(1)} label="분당 군말" />
            </div>
            <div className="mt-10">
              <LengthChart rows={perAnswer.map((x) => ({ number: x.number, seconds: x.m?.seconds ?? 0 }))} onPick={goto} />
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-2">
              2초 이상 멈춘 곳은 모두 {totals.longPauses}번입니다. 답변 길이 자체는 등급을 정하지 않지만, 1분이 안 되는 답변은 문단을 만들 시간이 부족하다는 신호입니다.
            </p>
            {estimated > 0 && (
              <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
                {estimated === result.answers.length ? "이 시험은" : `답변 ${estimated}개는`} 보조 음성인식으로 받아써서, 멈춘 횟수와 분당 단어 수가 녹음의 소리 크기로 추정한 값입니다.
              </p>
            )}
          </Section>

          {o && o.patterns.length > 0 && (
            <Section id="patterns" title="반복되는 습관" sub="여러 답변에 걸쳐 나타난 것만 모았습니다.">
              <div className="flex flex-col gap-9">
                {o.patterns.map((p, i) => (
                  <div key={i}>
                    <p className="text-[16px] font-semibold">{p.title}</p>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-ink-2">{p.detail}</p>
                    {p.examples.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1 border-l-2 border-line pl-4 text-[14px] leading-relaxed text-ink-2" lang="en">
                        {p.examples.map((e, j) => (
                          <li key={j}>“{e}”</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section id="answers" title="문항별 첨삭">
            <div className="no-print -mx-1 mb-10 flex flex-wrap gap-1">
              {result.questions.map((q) => (
                <button
                  key={q.number}
                  type="button"
                  onClick={() => setCurrent(q.number)}
                  className={`tabular h-9 min-w-9 rounded-ctl px-2 text-[14px] font-medium transition-colors ${
                    q.number === current ? "bg-ink text-paper" : "text-ink-2 hover:bg-wash hover:text-ink"
                  }`}
                  aria-current={q.number === current}
                >
                  {q.number}
                </button>
              ))}
            </div>
            {question && (
              <QuestionDetail
                key={question.number}
                question={question}
                answer={result.answers.find((a) => a.number === question.number)}
                feedback={evaluation.questions.find((f) => f.number === question.number)}
              />
            )}
            <div className="no-print mt-14 flex items-center justify-between border-t border-line pt-6">
              <Button variant="quiet" disabled={qIndex <= 0} onClick={() => goto(result.questions[qIndex - 1].number)}>
                <Icon name="back" className="size-4" />
                이전 문항
              </Button>
              <Button variant="quiet" disabled={qIndex >= result.questions.length - 1} onClick={() => goto(result.questions[qIndex + 1].number)}>
                다음 문항
                <Icon name="arrow" className="size-4" />
              </Button>
            </div>
          </Section>

          {o && o.plan.length > 0 && (
            <Section id="plan" title="다음 시험까지">
              <ol className="flex flex-col gap-7">
                {o.plan.map((p, i) => (
                  <li key={i} className="flex gap-5">
                    <span className="tabular w-6 shrink-0 text-[15px] font-semibold text-ink-3">{i + 1}</span>
                    <div>
                      <p className="text-[16px] font-semibold">{p.title}</p>
                      <p className="mt-1 text-[15px] leading-[1.75] text-ink-2">{p.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}
        </div>

        <footer className="mt-16 border-t border-line pt-6 text-[13px] leading-relaxed text-ink-3">
          <p>
            {model?.label ?? evaluation.modelId}로 평가 · 토큰 입력 {evaluation.usage.inputTokens.toLocaleString()} / 출력 {evaluation.usage.outputTokens.toLocaleString()}
            {llmCost !== null ? ` · 약 $${llmCost.toFixed(3)}` : " · 무료 등급 또는 가격 미상"} · 음성인식 {formatClock(sttSeconds)} · 약 ${sttCost.toFixed(3)}
          </p>
          <p className="mt-1">예상 등급은 공식 OPIc 결과가 아닙니다. 발음은 평가하지 않았습니다.</p>
          <div className="no-print mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onReevaluate}>
              다른 모델로 다시 평가
            </Button>
            <Button variant="quiet" onClick={() => window.print()}>
              인쇄
            </Button>
          </div>
        </footer>
      </main>
    </div>
  );
}
