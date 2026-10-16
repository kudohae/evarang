"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AiKeyFields, KeyNotice } from "@/components/account/AiKeyFields";
import { AuthShell, Field, FormError, safeNext, send, TextLink, useSubmit } from "@/components/account/parts";
import { useConfig, useReloadConfig } from "@/components/AccessGate";
import { Button, ChoiceRow, Spinner } from "@/components/ui";

export function SignupForm() {
  const config = useConfig();
  const reload = useReloadConfig();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [age, setAge] = useState(false);
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiKey, setAiKey] = useState("");
  const [invite, setInvite] = useState("");
  const { busy, error, setError, run } = useSubmit();

  const mismatch = confirm.length > 0 && confirm !== password;
  const ready = (!config.inviteRequired || invite.trim()) && email && nickname.trim() && password.length >= 8 && confirm === password && agree && age;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("비밀번호 확인이 일치하지 않습니다.");
    void run(async () => {
      await send("/api/auth/signup", "POST", { email, nickname, password, agree, age, ...(config.inviteRequired ? { invite } : {}), ...(aiKey.trim() ? { aiProvider, aiKey } : {}) });
      await reload();
      router.replace(next);
    });
  };

  if (!config.auth || config.user) {
    return (
      <AuthShell>
        <h1 className="text-[26px] font-bold tracking-[-0.02em]">가입</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {config.user ? (
            <>
              이미 {config.user.nickname}님으로 로그인되어 있습니다. <TextLink href="/account">내 정보</TextLink>
            </>
          ) : (
            "회원 기능이 아직 설정되지 않았습니다."
          )}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">가입</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        이미 계정이 있다면 <TextLink href={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`}>로그인</TextLink>
      </p>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        {config.inviteRequired && (
          <Field label="초대 코드" type="password" autoComplete="off" required autoFocus value={invite} onChange={(e) => setInvite(e.target.value)} hint="지금은 초대받은 사람만 가입할 수 있습니다." />
        )}
        <Field label="이메일" type="email" autoComplete="email" required autoFocus={!config.inviteRequired} value={email} onChange={(e) => setEmail(e.target.value)} hint="로그인할 때 씁니다." />
        <Field label="닉네임" autoComplete="nickname" required maxLength={20} value={nickname} onChange={(e) => setNickname(e.target.value)} hint="20자까지" />
        <Field label="비밀번호" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} hint="8자 이상" />
        <Field
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          hint={mismatch ? "비밀번호와 다릅니다." : undefined}
        />

        {config.aiKeys && (
          <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
            <legend className="float-left mb-1 w-full text-[15px] font-semibold text-ink">AI API 키 (선택)</legend>
            <AiKeyFields provider={aiProvider} onProvider={setAiProvider} value={aiKey} onValue={setAiKey} />
            <KeyNotice />
          </fieldset>
        )}

        <section className="rounded-panel border border-line bg-surface px-5 py-4 text-[14px] leading-[1.7] text-ink-2 shadow-panel">
          <p className="font-semibold text-ink">개인정보 수집·이용 (필수)</p>
          <dl className="mt-2 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 text-[13px]">
            <dt className="text-ink-3">항목</dt>
            <dd className="text-ink">이메일, 닉네임, 비밀번호(복원할 수 없는 형태로 암호화해 저장){config.aiKeys ? ", 입력한 경우 AI API 키(암호화해 저장)" : ""}</dd>
            <dt className="text-ink-3">목적</dt>
            <dd className="text-ink">회원 식별과 로그인{config.aiKeys ? ", 입력한 API 키로 평가 요청" : ""}</dd>
            <dt className="text-ink-3">보유 기간</dt>
            <dd className="text-ink">탈퇴할 때까지. 탈퇴하면 바로 삭제합니다.</dd>
          </dl>
          <p className="mt-2 text-[13px]">
            동의하지 않으면 가입할 수 없습니다. 자세한 내용은{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4">
              개인정보 처리방침
            </a>
            에 있습니다.
          </p>
          <div className="-mx-4 mt-2 flex flex-col gap-0.5">
            <ChoiceRow type="checkbox" checked={agree} onChange={() => setAgree(!agree)}>
              위 내용에 동의합니다.
            </ChoiceRow>
            <ChoiceRow type="checkbox" checked={age} onChange={() => setAge(!age)}>
              만 14세 이상입니다.
            </ChoiceRow>
          </div>
        </section>

        <FormError>{error}</FormError>
        <Button type="submit" disabled={busy || !ready}>
          {busy ? <Spinner /> : "가입하기"}
        </Button>
      </form>
    </AuthShell>
  );
}
