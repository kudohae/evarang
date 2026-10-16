"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signedOut, useOptionalConfig } from "@/components/AccessGate";
import { CoffeeLink } from "@/components/Support";
import { Wordmark } from "@/components/ui";
import { openFeatures } from "@/lib/features";

const WIDTH = { narrow: "max-w-[720px]", default: "max-w-[1040px]", wide: "max-w-[1280px]" } as const;

/**
 * The header every page outside the test itself shares: wordmark, the open features, sign-in.
 * On phones the feature links drop to a second row that scrolls sideways.
 */
export function AppShell({ children, width = "default" }: { children: ReactNode; width?: keyof typeof WIDTH }) {
  const path = usePathname();
  const config = useOptionalConfig();
  // Before signing in, only the wordmark and the coffee button: the features would all lead back to the login screen.
  const out = signedOut(config);
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print">
        <div className={`mx-auto flex w-full flex-wrap items-center gap-x-8 px-5 ${WIDTH[width]}`}>
          <div className="flex h-14 items-center">
            <Wordmark />
          </div>
          {!out && (
          <nav aria-label="기능" className="order-last -mx-5 w-[calc(100%+2.5rem)] overflow-x-auto px-5 sm:order-none sm:mx-0 sm:w-auto sm:flex-1 sm:px-0">
            <ul className="flex h-11 items-center gap-6 whitespace-nowrap sm:h-14">
              {openFeatures().map((f) => {
                const here = path === f.href || path.startsWith(`${f.href}/`);
                return (
                  <li key={f.id}>
                    <Link href={f.href} aria-current={here ? "page" : undefined} className={`text-[14px] ${here ? "font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}>
                      {f.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          )}
          <div className="ml-auto flex h-14 items-center gap-4 sm:ml-0">
            <CoffeeLink />
            {config?.auth && !out &&
              (config.user ? (
                <Link href="/account" className="text-[14px] font-medium text-ink-2 hover:text-ink">
                  {config.user.nickname}
                </Link>
              ) : (
                <Link href="/login" className="text-[14px] font-medium text-ink-2 hover:text-ink">
                  로그인
                </Link>
              ))}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
