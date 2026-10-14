"use client";

import Link from "next/link";
import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <AppShell>
      <main className={`rise mx-auto w-full flex-1 px-5 pb-24 pt-10 md:pt-16 ${wide ? "max-w-[560px]" : "max-w-[400px]"}`}>{children}</main>
    </AppShell>
  );
}

export function Field({ label, hint, ...props }: ComponentProps<"input"> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[14px] font-medium text-ink-2">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-12 rounded-ctl border border-line-strong bg-surface px-4 text-[16px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink disabled:text-ink-3"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-[13px] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="text-[14px] leading-relaxed text-pen-ink">
      {children}
    </p>
  );
}

export function TextLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} className="font-semibold text-ink underline underline-offset-4" />;
}

/** POSTs JSON and turns a failed response into its Korean error message. */
export async function send(path: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return;
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(data.error ?? `요청에 실패했습니다 (${res.status})`);
}

/** Runs a submit handler with a busy flag and a message for the first failure. */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

/** Only same-site paths are followed after signing in. */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}
