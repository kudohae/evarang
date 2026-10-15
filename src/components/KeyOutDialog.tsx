"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { Button } from "@/components/ui";
import { onOwnKeyOut } from "@/lib/client/notices";
import type { Config } from "@/components/AccessGate";

const SEEN = "evarang:key-out-shown";

/**
 * Tells a member when their own API key cannot be used (refused, or today's quota spent) and that grading
 * goes on with the site's free models, which have daily limits. At most once per page view; the check on
 * page load at most once per tab.
 */
export function KeyOutDialog({ config }: { config: Config }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => onOwnKeyOut((m) => setMessage((cur) => cur ?? m)), []);

  useEffect(() => {
    if (!config.user?.aiKey) return;
    const own = config.models.filter((m) => m.id.startsWith("own:"));
    if (!own.length || own.some((m) => m.available)) return;
    try {
      if (sessionStorage.getItem(SEEN)) return;
      sessionStorage.setItem(SEEN, "1");
    } catch {}
    setMessage("내 API 키의 오늘 사용량을 모두 썼거나, 키가 거부되었습니다.");
  }, [config]);

  // The server says which: refused (key deleted or changed) or today's quota spent; the load check cannot tell.
  const reason = !message
    ? ""
    : /거부/.test(message) && !/썼거나/.test(message)
      ? "Google이 내 API 키를 거부했습니다. 키가 지워졌거나 권한이 바뀌었을 수 있습니다."
      : /한도|사용량/.test(message)
        ? message.includes("썼거나") ? message : "내 API 키의 오늘 사용량을 모두 썼습니다."
        : message;

  return (
    <Dialog
      open={message !== null}
      onClose={() => setMessage(null)}
      title="내 API 키를 지금 쓸 수 없습니다"
      actions={
        <>
          <Link href="/account" onClick={() => setMessage(null)} className="inline-flex h-11 items-center rounded-ctl px-5 text-[15px] font-semibold text-ink-2 transition-colors hover:bg-wash hover:text-ink">
            내 정보에서 키 확인
          </Link>
          <Button onClick={() => setMessage(null)} autoFocus>
            확인
          </Button>
        </>
      }
    >
      <p>{reason}</p>
      <p className="mt-2">이어서 사이트의 무료 AI로 평가합니다. 이때는 하루 무료 한도가 적용됩니다.</p>
    </Dialog>
  );
}
