"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AiKeyFields, KeyNotice } from "@/components/account/AiKeyFields";
import { AuthShell, Field, FormError, send, useSubmit } from "@/components/account/parts";
import { aiProvider as providerById } from "@/lib/ai-providers";
import { useConfig, useReloadConfig } from "@/components/AccessGate";
import { Button, Spinner } from "@/components/ui";
import { clearOwnKeyOut } from "@/lib/client/notices";
import { accountDocs } from "@/lib/docs/account";
import { localDocs } from "@/lib/docs/local";
import { syncEnabled } from "@/lib/docs/policy";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-[14px] text-good">저장했습니다</span> : null;
}

export function AccountPage() {
  const config = useConfig();
  const reload = useReloadConfig();
  const router = useRouter();
  const user = config.user;

  useEffect(() => {
    if (config.auth && !user) router.replace("/login?next=/account");
  }, [config.auth, user, router]);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [leavePassword, setLeavePassword] = useState("");
  const [saved, setSaved] = useState<"" | "nickname" | "email" | "password" | "aiKey">("");
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiKey, setAiKey] = useState("");
  const [changingKey, setChangingKey] = useState(false);
  const keyForm = useSubmit();

  const profile = useSubmit();
  const mail = useSubmit();
  const pass = useSubmit();
  const leave = useSubmit();
  const out = useSubmit();
  const records = useSubmit();
  const [stored, setStored] = useState<number | null>(null);
  const keep = syncEnabled(user);

  useEffect(() => {
    if (!keep) return setStored(null);
    void accountDocs.list("exam").then((l) => setStored(l.filter((d) => !d.deletedAt).length), () => setStored(null));
  }, [keep]);

  if (!config.auth) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">내 정보</h1>
        <p className="mt-3 text-[15px] text-ink-2">회원 기능이 아직 설정되지 않았습니다.</p>
      </AuthShell>
    );
  }
  if (!user) {
    return (
      <AuthShell>
        <div className="flex justify-center pt-16 text-ink-3">
          <Spinner className="size-5" />
        </div>
      </AuthShell>
    );
  }

  const emailChanged = email.trim().toLowerCase() !== user.email;
  const flash = (what: typeof saved) => {
    setSaved(what);
    window.setTimeout(() => setSaved((s) => (s === what ? "" : s)), 2500);
  };

  return (
    <AuthShell wide>
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">내 정보</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        {new Date(user.createdAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}에 가입했습니다.
      </p>

      <div className="mt-10 flex flex-col gap-10">
        <Section title="닉네임">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void profile.run(async () => {
                await send("/api/account", "PATCH", { nickname });
                await reload();
                flash("nickname");
              });
            }}
          >
            <Field label="닉네임" maxLength={20} required value={nickname} onChange={(e) => setNickname(e.target.value)} />
            <FormError>{profile.error}</FormError>
            <div className="flex items-center gap-4">
              <Button type="submit" variant="secondary" disabled={profile.busy || !nickname.trim() || nickname.trim() === user.nickname}>
                {profile.busy ? <Spinner /> : "저장"}
              </Button>
              <Saved show={saved === "nickname"} />
            </div>
          </form>
        </Section>

        <Section title="이메일">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void mail.run(async () => {
                await send("/api/account", "PATCH", { email, currentPassword: emailPassword });
                setEmailPassword("");
                await reload();
                flash("email");
              });
            }}
          >
            <Field label="이메일" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} hint="로그인할 때 쓰는 주소입니다." />
            {emailChanged && (
              <Field label="현재 비밀번호" type="password" autoComplete="current-password" required value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
            )}
            <FormError>{mail.error}</FormError>
            <div className="flex items-center gap-4">
              <Button type="submit" variant="secondary" disabled={mail.busy || !emailChanged || !emailPassword}>
                {mail.busy ? <Spinner /> : "이메일 변경"}
              </Button>
              <Saved show={saved === "email"} />
            </div>
          </form>
        </Section>

        <Section title="비밀번호">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (next !== confirm) return pass.setError("새 비밀번호 확인이 일치하지 않습니다.");
              void pass.run(async () => {
                await send("/api/account/password", "POST", { currentPassword: current, newPassword: next });
                setCurrent("");
                setNext("");
                setConfirm("");
                flash("password");
              });
            }}
          >
            <Field label="현재 비밀번호" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
            <Field label="새 비밀번호" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} hint="8자 이상. 바꾸면 다른 기기에서는 로그아웃됩니다." />
            <Field
              label="새 비밀번호 확인"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              hint={confirm && confirm !== next ? "새 비밀번호와 다릅니다." : undefined}
            />
            <FormError>{pass.error}</FormError>
            <div className="flex items-center gap-4">
              <Button type="submit" variant="secondary" disabled={pass.busy || !current || next.length < 8 || next !== confirm}>
                {pass.busy ? <Spinner /> : "비밀번호 변경"}
              </Button>
              <Saved show={saved === "password"} />
            </div>
          </form>
        </Section>

        {config.aiKeys && (
          <Section title="AI API 키">
            {user.aiKey && !changingKey ? (
              <>
                <p className="text-[15px] text-ink">
                  {providerById(user.aiKey.provider)?.label ?? user.aiKey.provider} · <span className="tabular">••••{user.aiKey.hint}</span>
                </p>
                <p className="text-[13px] leading-relaxed text-ink-3">평가와 피드백을 이 키로 받습니다. 키에 문제가 생기면 사이트의 무료 AI로 넘어가고, 그때는 하루 한도가 적용됩니다.</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setAiProvider(user.aiKey!.provider);
                      setChangingKey(true);
                    }}
                  >
                    키 바꾸기
                  </Button>
                  <Button
                    variant="quiet"
                    disabled={keyForm.busy}
                    onClick={() => {
                      if (!window.confirm("API 키를 지울까요? 이후 평가는 사이트의 무료 AI를 하루 한도 안에서 씁니다.")) return;
                      void keyForm.run(async () => {
                        await send("/api/account/ai-key", "DELETE");
                        await reload();
                      });
                    }}
                  >
                    {keyForm.busy ? <Spinner /> : "키 지우기"}
                  </Button>
                  <Saved show={saved === "aiKey"} />
                </div>
              </>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void keyForm.run(async () => {
                    await send("/api/account/ai-key", "PUT", { provider: aiProvider, key: aiKey });
                    clearOwnKeyOut();
                    setAiKey("");
                    setChangingKey(false);
                    await reload();
                    flash("aiKey");
                  });
                }}
              >
                <AiKeyFields provider={aiProvider} onProvider={setAiProvider} value={aiKey} onValue={setAiKey} required />
                <KeyNotice />
                <div className="flex items-center gap-4">
                  <Button type="submit" variant="secondary" disabled={keyForm.busy || aiKey.trim().length < 10}>
                    {keyForm.busy ? <Spinner /> : "키 확인하고 저장"}
                  </Button>
                  {changingKey && (
                    <Button type="button" variant="quiet" onClick={() => (setChangingKey(false), setAiKey(""))}>
                      취소
                    </Button>
                  )}
                  <Saved show={saved === "aiKey"} />
                </div>
              </form>
            )}
            <FormError>{keyForm.error}</FormError>
          </Section>
        )}

        <Section title="시험 기록 저장">
          {keep ? (
            <>
              <p className="text-[14px] leading-relaxed text-ink-2">
                시험 기록을 계정에 저장하고 있습니다{stored !== null ? ` (${stored}개)` : ""}. 다른 기기에서 로그인해도 지난 시험과 보고서를 볼 수 있습니다.
              </p>
              <div>
                <Button
                  variant="secondary"
                  disabled={records.busy}
                  onClick={() => {
                    if (!window.confirm("저장을 끄면 계정에 저장한 시험 기록과 녹음을 모두 삭제합니다. 이 브라우저의 기록은 남습니다.")) return;
                    void records.run(async () => {
                      await accountDocs.setRecordsConsent(false);
                      // Forget what was sent, so turning it on again uploads everything afresh.
                      await localDocs.clearSync().catch(() => {});
                      await reload();
                    });
                  }}
                >
                  {records.busy ? <Spinner /> : "저장 끄고 계정의 기록 삭제"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[14px] leading-relaxed text-ink-2">
                켜면 설문 답변, 답변 녹음, 받아쓴 글, 평가 결과, 입력한 실제 OPIc 등급을 계정에 저장합니다. 다른 기기에서도 볼 수 있고, 저장을 끄거나 탈퇴하면 바로 삭제합니다.
              </p>
              <div>
                <Button
                  variant="secondary"
                  disabled={records.busy}
                  onClick={() =>
                    void records.run(async () => {
                      await accountDocs.setRecordsConsent(true);
                      await reload();
                    })
                  }
                >
                  {records.busy ? <Spinner /> : "동의하고 저장 켜기"}
                </Button>
              </div>
            </>
          )}
          <FormError>{records.error}</FormError>
        </Section>

        <Section title="로그아웃">
          <div>
            <Button
              variant="secondary"
              disabled={out.busy}
              onClick={() =>
                void out.run(async () => {
                  await send("/api/auth/logout", "POST");
                  // A full load: reloading the config first would bounce this page to the login screen.
                  window.location.assign("/");
                })
              }
            >
              {out.busy ? <Spinner /> : "로그아웃"}
            </Button>
          </div>
          <FormError>{out.error}</FormError>
        </Section>

        <Section title="회원 탈퇴">
          <p className="text-[14px] leading-relaxed text-ink-2">
            계정과 로그인 정보, 계정에 저장한 시험 기록과 녹음을 바로 삭제합니다. 되돌릴 수 없습니다. 이 브라우저에 저장된 기록은 그대로 남고, 예측 개선용으로 저장한 기록은 각 보고서 아래에서 따로
            삭제할 수 있습니다.
          </p>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm("정말 탈퇴할까요? 계정을 되살릴 수 없습니다.")) return;
              void leave.run(async () => {
                await send("/api/account", "DELETE", { password: leavePassword });
                window.location.assign("/");
              });
            }}
          >
            <Field label="비밀번호" type="password" autoComplete="current-password" required value={leavePassword} onChange={(e) => setLeavePassword(e.target.value)} />
            <FormError>{leave.error}</FormError>
            <div>
              <button
                type="submit"
                disabled={leave.busy || !leavePassword}
                className="inline-flex h-11 items-center gap-2 rounded-ctl border border-pen/40 px-5 text-[15px] font-semibold text-pen-ink transition-colors hover:bg-pen-soft disabled:cursor-not-allowed disabled:border-line disabled:text-ink-3 disabled:hover:bg-transparent"
              >
                {leave.busy ? <Spinner /> : "탈퇴하기"}
              </button>
            </div>
          </form>
        </Section>
      </div>
    </AuthShell>
  );
}
