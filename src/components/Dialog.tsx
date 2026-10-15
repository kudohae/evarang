"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** A modal on the native <dialog>: focus stays inside, Esc and the backdrop close it. */
export function Dialog({ open, onClose, title, children, actions }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="dialog-title"
      className="sheet m-auto w-[min(440px,calc(100vw-32px))] rounded-panel border border-line bg-surface p-0 text-ink shadow-panel"
    >
      {open && (
        <div className="pop px-6 pb-5 pt-6">
          <h2 id="dialog-title" className="text-[18px] font-bold tracking-[-0.01em]">
            {title}
          </h2>
          <div className="mt-3 text-[15px] leading-[1.7] text-ink-2">{children}</div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">{actions}</div>
        </div>
      )}
    </dialog>
  );
}
