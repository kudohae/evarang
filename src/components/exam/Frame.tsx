import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";

const STEPS = ["Background Survey", "Self Assessment", "Pre-Test Setup", "Sample Question"];

/** Orientation screens: header with a plain-text stepper, a reading column, and a fixed action bar. */
export function Frame({
  step,
  title,
  lead,
  children,
  actions,
  aside,
}: {
  step: number | null;
  title: string;
  lead?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1040px] items-center justify-between gap-6 px-5">
          <Wordmark />
          {step !== null && (
            <ol className="hidden items-center gap-5 text-[13px] md:flex">
              {STEPS.map((s, i) => (
                <li key={s} className={i === step ? "font-semibold text-ink" : i < step ? "text-ink-2" : "text-ink-3"}>
                  <span className="tabular mr-1.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          {step !== null && (
            <span className="tabular text-[13px] text-ink-2 md:hidden">
              {step + 1}/{STEPS.length} · {STEPS[step]}
            </span>
          )}
        </div>
      </header>

      <main key={title} className="rise mx-auto w-full max-w-[720px] flex-1 px-5 pb-36 pt-12 md:pt-16">
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] md:text-[30px]">{title}</h1>
        {lead && <div className="mt-3 text-[15px] leading-relaxed text-ink-2">{lead}</div>}
        <div className="mt-9">{children}</div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/92 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[720px] items-center justify-between gap-4 px-5">
          <div className="min-w-0 text-[14px] text-ink-2">{aside}</div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      </footer>
    </div>
  );
}
