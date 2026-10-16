"use client";

import type { ReactNode } from "react";
import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui";

/* Support for the site: the coffee button in the header, and the operator's note before a test's result. */

export const SUPPORT_URL = "https://www.buymeacoffee.com/hinoamchomsky02";

/** The Buy Me a Coffee cup, drawn here instead of loading their script. */
function Cup({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M5 8h12l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 8Z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6.1 12.5h9.8l-.6 4.5H6.7l-.6-4.5Z" fill="#000" />
      <path d="M17 10h1.3a2.2 2.2 0 0 1 0 4.4h-1.8" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 8h14" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 3.5c-.6.8-.6 1.7 0 2.5M12.5 3.5c-.6.8-.6 1.7 0 2.5" fill="none" stroke="#000" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The header's coffee button: Buy Me a Coffee's own look (Cookie lettering, black outline and text, white
 * cup) on 에바랑's lime instead of their yellow. On phones only the cup shows.
 */
export function CoffeeLink() {
  return (
    <a
      href={SUPPORT_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Buy me a coffee (새 창)"
      className="inline-flex h-9 shrink-0 select-none items-center gap-1 rounded-full border border-black bg-primary px-2.5 text-black transition-[transform,filter] duration-150 hover:brightness-95 active:scale-[0.96] sm:pr-3.5"
    >
      <Cup className="size-[22px]" />
      <span className="hidden whitespace-nowrap text-[21px] leading-none sm:inline" style={{ fontFamily: "Cookie, cursive" }}>
        Buy me a coffee
      </span>
    </a>
  );
}

/** What the operator says before a mock test's result opens. Edit freely; paragraphs are separate items. */
export const SUPPORT_NOTE: ReactNode[] = [
  "안녕하세요! 에바랑 운영자입니다.",
  "결과를 보기 전 한 가지 말씀드리자면, 에바랑은 광고 없이 운영하고 있습니다. 답변을 받아쓰고 평가하는 데에는 매번 비용이 듭니다.",
  "모의고사가 시험 준비에 도움이 됐다면, 커피 한 잔 값으로 응원해 주세요. 후원은 에바랑을 계속 무료로 열어 두는 데 씁니다. 후원하지 않아도 모든 기능은 그대로 쓸 수 있습니다.",
];

/** Shown once when "보고서 보기" is pressed after a test; closing it any way opens the result. */
export function SupportNote({ open, onContinue }: { open: boolean; onContinue: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onContinue}
      title="결과를 보기 전에"
      actions={
        <>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 select-none items-center gap-1.5 rounded-ctl border border-black bg-primary px-4 text-[15px] font-semibold text-black transition-[transform,filter] duration-150 hover:brightness-95 active:scale-[0.985]"
          >
            <Cup className="size-5" />
            커피 한 잔 후원하기
          </a>
          <Button variant="secondary" onClick={onContinue} autoFocus>
            결과 보기
          </Button>
        </>
      }
    >
      {SUPPORT_NOTE.map((p, i) => (
        <p key={i} className={i ? "mt-2" : "font-semibold text-ink"}>
          {p}
        </p>
      ))}
    </Dialog>
  );
}
