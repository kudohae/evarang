"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { LoginForm } from "@/components/account/LoginForm";
import { KeyOutDialog } from "@/components/KeyOutDialog";
import { Spinner } from "@/components/ui";

export type Config = {
  /** The site is for signed-in members (accounts are set up). */
  accessRequired: boolean;
  /** This visitor may use the site: signed in, or the site has no accounts. */
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

/** The visitor still has to sign in. */
export function signedOut(c: Config | null): boolean {
  return Boolean(c?.accessRequired && !c.hasAccess);
}

/**
 * Fetches server config once. With accounts, a visitor who has not signed in gets the login screen in place
 * of the page, and the page itself once signed in; `open` pages (login, sign-up) show anyway. Without
 * accounts (local development, tests) the site is open.
 */
export function AccessGate({ children, open = false }: { children: ReactNode; open?: boolean }) {
  const [config, setConfig] = useState<Config | null>(null);

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

  return (
    <ReloadContext.Provider value={load}>
      <ConfigContext.Provider value={config}>
        {signedOut(config) && !open ? (
          <Suspense>
            <LoginForm gate />
          </Suspense>
        ) : (
          children
        )}
        <KeyOutDialog config={config} />
      </ConfigContext.Provider>
    </ReloadContext.Provider>
  );
}
