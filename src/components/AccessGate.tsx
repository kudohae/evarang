"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Button, Spinner, Wordmark } from "@/components/ui";

export type Config = {
  accessRequired: boolean;
  hasAccess: boolean;
  stt: boolean;
  /** Server can store research records (database and blob store configured). */
  research: boolean;
  /** Accounts are available (a database is configured). */
  auth: boolean;
  user: { email: string; nickname: string; createdAt: string; recordsConsent: boolean; aiKey?: { provider: string; hint: string } | null } | null;
  /** Members can bring their own AI key (the server has a secret to encrypt it). */
  aiKeys?: boolean;
  models: { id: string; available: boolean }[];
  /** Which storage the server has. Without a blob store, recordings stay in the browser. */
  storage?: { database: boolean; blob: boolean };
};

const ConfigContext = createContext<Config | null>(null);
const ReloadContext = createContext<() => Promise<void>>(async () => {});

/** Re-reads the server config, e.g. after signing in or out. */
export function useReloadConfig() {
  return useContext(ReloadContext);
}

/** The config, or null on pages outside AccessGate (e.g. the privacy policy). */
export function useOptionalConfig(): Config | null {
  return useContext(ConfigContext);
}

export function useConfig(): Config {
  const c = useContext(ConfigContext);
  if (!c) throw new Error("useConfig outside AccessGate");
  return c;
}

/** Fetches server config once; asks for the access code when the server requires one. */
export function AccessGate({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/config", { cache: "no-store" });
    setConfig(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!config) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-3">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (config.accessRequired && !config.hasAccess) {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError("");
      const res = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      setBusy(false);
      if (!res.ok) return setError("접근 코드가 맞지 않습니다.");
      await load();
    };
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="mx-auto flex h-14 w-full max-w-[1040px] items-center px-5">
          <Wordmark />
        </header>
        <main className="rise mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center px-5 pb-24">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">접근 코드</h1>
          <p className="mt-2 text-[15px] text-ink-2">지금은 초대받은 사람만 쓸 수 있습니다.</p>
          <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
            <input
              type="password"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 rounded-ctl border border-line-strong bg-surface px-4 text-[16px] outline-none focus:border-ink"
              aria-label="접근 코드"
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

  return (
    <ReloadContext.Provider value={load}>
      <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
    </ReloadContext.Provider>
  );
}
