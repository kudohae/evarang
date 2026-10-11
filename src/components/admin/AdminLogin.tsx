"use client";

import { useState } from "react";
import { Button, Spinner, Wordmark } from "@/components/ui";

export function AdminLogin({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-[1040px] items-center px-5">
        <Wordmark />
      </header>
      <main className="rise mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center px-5 pb-24">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">관리자</h1>
        <p className="mt-2 text-[15px] text-ink-2">저장된 기록은 관리자 코드로만 볼 수 있습니다.</p>
        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
            setBusy(false);
            if (res.ok) onDone();
            else setError("관리자 코드가 맞지 않거나, 서버에 ADMIN_CODE가 설정되지 않았습니다.");
          }}
        >
          <input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 rounded-ctl border border-line-strong bg-surface px-4 text-[16px] outline-none focus:border-ink"
            aria-label="관리자 코드"
          />
          {error && <p className="text-[14px] text-pen-ink">{error}</p>}
          <Button type="submit" disabled={!code || busy}>
            {busy ? <Spinner /> : "확인"}
          </Button>
        </form>
      </main>
    </div>
  );
}
