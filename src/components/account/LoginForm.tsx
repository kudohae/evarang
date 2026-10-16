"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell, Field, FormError, safeNext, send, TextLink, useSubmit } from "@/components/account/parts";
import { useConfig, useReloadConfig } from "@/components/AccessGate";
import { Button, Spinner } from "@/components/ui";

/**
 * `gate`: shown in place of a page the visitor may not open yet (see AccessGate); signing in opens that
 * page where it is, instead of going to `?next=`.
 */
export function LoginForm({ gate = false }: { gate?: boolean }) {
  const config = useConfig();
  const reload = useReloadConfig();
  const router = useRouter();
  const path = usePathname();
  const search = useSearchParams();
  const next = gate ? safeNext(`${path}${search.size ? `?${search}` : ""}`) : safeNext(search.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { busy, error, run } = useSubmit();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await send("/api/auth/login", "POST", { email, password });
      await reload();
      if (!gate) router.replace(next);
    });
  };

  return (
    <AuthShell>
      <h1 className="text-[26px] font-bold tracking-[-0.02em]">로그인</h1>
      {gate && <p className="mt-3 text-[15px] leading-relaxed text-ink-2">에바랑은 회원만 쓸 수 있습니다. OPIc 모의고사, 첨삭노트, 말하기 연습을 로그인해서 시작하세요.</p>}
      {!config.auth ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">회원 기능이 아직 설정되지 않았습니다.</p>
      ) : config.user ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
          {config.user.nickname}님으로 로그인되어 있습니다. <TextLink href="/account">내 정보</TextLink>
        </p>
      ) : (
        <>
          <p className="mt-2 text-[15px] text-ink-2">
            처음이라면 <TextLink href={next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`}>가입하기</TextLink>
          </p>
          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            <Field label="이메일" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="비밀번호" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <FormError>{error}</FormError>
            <Button type="submit" disabled={busy || !email || !password}>
              {busy ? <Spinner /> : "로그인"}
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
