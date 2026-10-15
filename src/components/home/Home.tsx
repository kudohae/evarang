"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useConfig, useReloadConfig } from "@/components/AccessGate";
import { AppShell } from "@/components/AppShell";
import { Button, Icon, Spinner } from "@/components/ui";
import { accountDocs, type RemoteSummary } from "@/lib/docs/account";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";
import { pushDoc, syncKind } from "@/lib/docs/sync";
import { latestEvaluation, type ExamResult } from "@/lib/exam/result";
import { FEATURES } from "@/lib/features";
import { modelLabel } from "@/lib/models";

const DIFFERENCES = [
  {
    title: "시험장과 같은 조건에서 말하게 됩니다.",
    body: "질문은 글자 없이 음성으로만 나오고, 다시 듣기는 질문이 끝난 뒤 5초 안에 한 번뿐입니다. 서베이와 난이도에 맞춰 12~15문항이 나오고, 7번 문항 뒤에 난이도를 다시 고릅니다. 채팅창에서 질문을 읽고 천천히 답하는 연습으로는 이 압박을 겪어볼 수 없습니다.",
  },
  {
    title: "실제로 말한 그대로 평가받습니다.",
    body: "um, uh 같은 군말과 2초 넘게 멈춘 곳까지 받아써서 답변 위에 표시합니다. 보통의 음성 입력 기능은 군말을 지우고 문장을 다듬기 때문에, 실제보다 매끄럽게 말한 것처럼 보입니다.",
  },
  {
    title: "시험 전체를 하나의 기준으로 판정합니다.",
    body: "ACTFL의 네 가지 기준으로 모든 답변을 함께 보고 등급을 매깁니다. 가장 잘한 답변이 아니라 끝까지 유지한 수준을 봅니다. 답변을 하나씩 따로 물어보면 그때마다 기준이 흔들리기 쉽습니다.",
  },
  {
    title: "다음 등급까지 무엇을 바꿔야 하는지 내 문장으로 보여줍니다.",
    body: "틀린 곳은 내 답변 위에 바로 고쳐 쓰고, 내가 한 말을 한 단계 위 수준으로 다시 써서 들려줍니다. 응시할 때마다 기록이 남아 지난 시험과 비교할 수 있습니다.",
  },
];

type Row = { id: string; createdAt: number; grade: string | null; startLevel: number | null; finalLevel: number | null; count: number | null; model: string | null };

function fromLocal(r: ExamResult): Row {
  const ev = latestEvaluation(r);
  return { id: r.id, createdAt: r.createdAt, grade: ev?.overall?.grade ?? null, startLevel: r.startLevel, finalLevel: r.finalLevel, count: r.questions.length, model: ev?.modelId ?? null };
}

function fromAccount(e: RemoteSummary): Row {
  const s = e.summary as { createdAt?: number | null; grade?: string | null; startLevel?: number | null; finalLevel?: number | null; questionCount?: number | null; model?: string | null };
  return {
    id: e.id,
    createdAt: typeof s.createdAt === "number" ? s.createdAt : e.updatedAt,
    grade: s.grade ?? null,
    startLevel: s.startLevel ?? null,
    finalLevel: s.finalLevel ?? null,
    count: s.questionCount ?? null,
    model: s.model ?? null,
  };
}

function Soon() {
  return <span className="shrink-0 text-[13px] text-ink-3">준비 중</span>;
}

/** What the site offers, from the feature list. Open features link; the rest are listed so the plan is visible. */
function Menu() {
  const idle = "flex items-center gap-5 py-5";
  return (
    <nav aria-label="메뉴" className="mt-12">
      <ul className="border-t border-line">
        {FEATURES.map((f) =>
          f.status === "open" ? (
            <li key={f.id} className="border-b border-line">
              <Link href={f.href} className={`group ${idle}`}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-semibold tracking-[-0.01em]">{f.label}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{f.description}</span>
                  {f.children && (
                    <span className="mt-2 flex flex-col gap-0.5 text-[13px] text-ink-3">
                      {f.children.map((c) => (
                        <span key={c.id}>
                          <span className="font-semibold text-ink-2">{c.label}</span> · {c.description}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {f.meta && <span className="hidden shrink-0 text-[13px] text-ink-3 sm:block">{f.meta}</span>}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink transition-transform duration-150 group-hover:translate-x-0.5">
                  <Icon name="arrow" className="size-4" />
                </span>
              </Link>
            </li>
          ) : f.children ? (
            <li key={f.id} className="border-b border-line py-5" aria-disabled="true">
              <span className="block text-[18px] font-semibold tracking-[-0.01em] text-ink-3">{f.label}</span>
              <span className="mt-1 block text-[14px] leading-relaxed text-ink-3">{f.description}</span>
              <ul className="mt-3 flex flex-col gap-2 border-l-2 border-line pl-4">
                {f.children.map((c) => (
                  <li key={c.id} className="flex items-baseline gap-5">
                    <span className="min-w-0 flex-1 text-[15px] text-ink-3">
                      <span className="font-semibold">{c.label}</span> · {c.description}
                    </span>
                    <Soon />
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={f.id} className="border-b border-line" aria-disabled="true">
              <div className={idle}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-semibold tracking-[-0.01em] text-ink-3">{f.label}</span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-ink-3">{f.description}</span>
                </span>
                <Soon />
              </div>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}

const DISMISS_KEY = "evarang:records-prompt-dismissed";

/** Asks a signed-in member, once, whether to keep test records in the account. */
function RecordsPrompt({ onAgree }: { onAgree: () => Promise<void> }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (hidden) return null;
  return (
    <section className="rise mt-12 rounded-panel border border-line bg-surface px-5 py-5 shadow-panel md:px-6">
      <h2 className="text-[16px] font-semibold">시험 기록을 계정에 저장할까요?</h2>
      <p className="mt-2 text-[14px] leading-[1.7] text-ink-2">
        다른 기기에서도 지난 시험과 보고서를 볼 수 있고, 이 브라우저 데이터를 지워도 남습니다. 지금 이 브라우저에 있는 기록도 함께 저장합니다.
      </p>
      <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-[13px]">
        <dt className="text-ink-3">항목</dt>
        <dd className="text-ink">설문 답변, 답변 녹음, 받아쓴 글, 평가 결과, 입력한 실제 OPIc 등급</dd>
        <dt className="text-ink-3">보유 기간</dt>
        <dd className="text-ink">저장을 끄거나 탈퇴할 때까지. 그때 바로 삭제합니다.</dd>
      </dl>
      {error && <p className="mt-3 text-[14px] text-pen-ink">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await onAgree();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Spinner /> : "동의하고 저장하기"}
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
            setHidden(true);
          }}
        >
          나중에
        </Button>
      </div>
    </section>
  );
}

export function Home() {
  const config = useConfig();
  const reload = useReloadConfig();
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const [remote, setRemote] = useState<RemoteSummary[]>([]);
  const [uploading, setUploading] = useState(0);
  const keep = syncEnabled(config.user);
  const audio = config.storage?.blob !== false;

  const loadLocal = () =>
    localDocs
      .list<ExamResult>("exam")
      .then((list) => setResults(list.flatMap((d) => (d.data ? [d.data] : [])).sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => setResults([]));

  useEffect(() => {
    void loadLocal();
  }, []);

  // On arrival: take in the account's deletions, list its tests, then send what it is missing one at a time.
  const syncing = useRef(false);
  useEffect(() => {
    if (!keep) return setRemote([]);
    if (syncing.current) return;
    syncing.current = true;
    void (async () => {
      try {
        const { remote, push } = await syncKind("exam", { audio });
        setRemote(remote);
        await loadLocal();
        for (let i = 0; i < push.length; i++) {
          setUploading(push.length - i);
          await pushDoc("exam", push[i], { audio });
        }
        setUploading(0);
        if (push.length) {
          await loadLocal();
          setRemote((await accountDocs.list("exam").catch(() => [])).filter((d) => !d.deletedAt));
        }
        // Practice, notes and stories saved elsewhere whose push did not finish (a closed tab) go up now, quietly.
        for (const kind of ["session", "note", "story"] as const) {
          const other = await syncKind(kind, { audio }).catch(() => null);
          for (const id of other?.push ?? []) await pushDoc(kind, id, { audio });
        }
      } catch {
        setRemote([]);
      } finally {
        syncing.current = false;
      }
    })();
  }, [keep]);

  const local = (results ?? []).map(fromLocal);
  const rows = [...local, ...remote.filter((e) => !local.some((l) => l.id === e.id)).map(fromAccount)].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AppShell>
      <main className="mx-auto max-w-[720px] px-5 pb-24">
        <section className="rise pt-16 md:pt-24">
          <h1 className="text-[34px] font-bold leading-[1.22] tracking-[-0.03em] md:text-[44px]">
            실제 OPIc 순서 그대로 보고,
            <br />
            말한 그대로 첨삭받는 모의고사
          </h1>
          <p className="mt-5 max-w-[560px] text-[17px] leading-[1.7] text-ink-2">
            모의고사로 지금 수준을 확인하고, 약한 곳을 골라 연습합니다.
          </p>
          <Menu />
          {!config.stt && <p className="mt-6 text-[14px] text-pen-ink">서버에 음성인식 키가 설정되지 않아 지금은 답변을 받아쓸 수 없습니다.</p>}
        </section>

        {config.user && !keep && (
          <RecordsPrompt
            onAgree={async () => {
              await accountDocs.setRecordsConsent(true);
              await reload();
            }}
          />
        )}

        {rows.length > 0 && (
          <section className="mt-24">
            <h2 className="flex items-baseline justify-between gap-4 text-[15px] font-semibold text-ink-2">
              지난 시험
              {uploading > 0 && <span className="text-[13px] font-normal text-ink-3">계정에 저장하는 중 · {uploading}개 남음</span>}
            </h2>
            <ul className="mt-4">
              {rows.slice(0, 12).map((r) => {
                return (
                  <li key={r.id} className="border-t border-line first:border-t-0">
                    <Link href={`/results/${r.id}`} className="group flex items-center gap-5 py-4">
                      <span className="tabular w-14 shrink-0 text-[22px] font-bold tracking-[-0.02em]">{r.grade ?? "—"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium">
                          {new Date(r.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <span className="block text-[13px] text-ink-3">
                          난이도 {r.startLevel ?? "?"}→{r.finalLevel ?? "?"} · {r.count ?? "?"}문항 · {r.model ? modelLabel(r.model) : "평가 전"}
                        </span>
                      </span>
                      <Icon name="arrow" className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-24">
          <h2 className="text-[22px] font-bold tracking-[-0.02em]">AI와 혼자 연습할 때와 다른 점</h2>
          <ol className="mt-8 flex flex-col">
            {DIFFERENCES.map((d, i) => (
              <li key={d.title} className="flex gap-5 border-t border-line py-7 first:border-t-0 first:pt-0">
                <span className="tabular w-5 shrink-0 pt-px text-[16px] font-semibold text-ink-3">{i + 1}</span>
                <div>
                  <p className="text-[17px] font-semibold leading-snug">{d.title}</p>
                  <p className="mt-2 text-[15px] leading-[1.75] text-ink-2">{d.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-20 border-t border-line pt-6 text-[13px] leading-relaxed text-ink-3">
          <p>예상 등급은 공식 OPIc 결과가 아닙니다. 발음은 평가하지 않습니다.</p>
          <p>
            녹음과 결과는 이 브라우저에 저장됩니다. 받아쓰기와 평가를 위해 녹음과 받아쓴 글이 음성인식·평가 서비스로 전송되고, 계정 저장이나 예측 개선용 저장에 동의한 경우에만 서버에
            보관됩니다.
          </p>
          <p className="mt-2">
            <a href="/privacy" className="underline underline-offset-4 hover:text-ink-2">
              개인정보 처리방침
            </a>
          </p>
        </footer>
      </main>
    </AppShell>
  );
}
