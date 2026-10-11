"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import type { FallbackReason } from "@/lib/types";

const FIRST_LINE: Record<FallbackReason, string> = {
  credits: "기본 음성인식의 이용 한도를 모두 써서, 지금부터는 보조 음성인식으로 답변을 받아씁니다.",
  unavailable: "기본 음성인식에 연결되지 않아, 지금부터는 보조 음성인식으로 답변을 받아씁니다.",
};

/** Shown once when transcription moves to the backup recogniser. Calm, specific, no alarm. */
export function FallbackNotice({ reason, onClose, during }: { reason: FallbackReason; onClose: () => void; during: "setup" | "after" }) {
  const button = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    button.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [mounted, onClose]);

  if (!mounted) return null;
  // Portalled to <body>: the screens' entrance animation would otherwise trap a fixed overlay inside the column.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fallback-title"
        className="rise w-full max-w-[460px] rounded-panel bg-surface px-6 pb-6 pt-7 shadow-[0_12px_40px_-12px_rgba(23,23,26,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="fallback-title" className="text-[18px] font-bold tracking-[-0.01em]">
          보조 음성인식으로 받아씁니다
        </h2>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink">{FIRST_LINE[reason]}</p>
        <p className="mt-3 text-[15px] leading-[1.7] text-ink-2">
          답변 내용과 문법·어휘 첨삭, 등급 판정은 같은 기준으로 이루어집니다. 다만 멈춘 위치와 말하기 속도는 녹음의 소리 크기로 추정한 값이라 실제와 조금 다를 수 있고, 아주 짧은 군말은 가끔 빠질 수 있습니다.
        </p>
        {during === "setup" && <p className="mt-3 text-[14px] leading-relaxed text-ink-3">시험은 그대로 진행하시면 됩니다.</p>}
        <div className="mt-6 flex justify-end">
          <Button ref={button} onClick={onClose}>
            확인
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
