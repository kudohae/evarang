"use client";

import { useId } from "react";
import { Field } from "@/components/account/parts";
import { AI_PROVIDERS, aiProvider, KEY_NOTICE } from "@/lib/ai-providers";

/** Which AI service and its key. Only services with an adapter can be picked; the rest show as coming. */
export function AiKeyFields({
  provider,
  onProvider,
  value,
  onValue,
  label = "API 키",
  required = false,
}: {
  provider: string;
  onProvider: (id: string) => void;
  value: string;
  onValue: (v: string) => void;
  label?: string;
  required?: boolean;
}) {
  const id = useId();
  const p = aiProvider(provider);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[14px] font-medium text-ink-2">
          AI 종류
        </label>
        <select
          id={id}
          value={provider}
          onChange={(e) => onProvider(e.target.value)}
          className="h-12 rounded-ctl border border-line-strong bg-surface px-3 text-[16px] text-ink outline-none transition-colors focus:border-ink"
        >
          {AI_PROVIDERS.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.enabled}>
              {a.enabled ? a.label : `${a.label} · 준비 중`}
            </option>
          ))}
        </select>
      </div>
      <Field
        label={label}
        type="password"
        autoComplete="off"
        spellCheck={false}
        required={required}
        placeholder={p?.placeholder}
        value={value}
        onChange={(e) => onValue(e.target.value)}
      />
      {p?.keyUrl && (
        <a href={p.keyUrl} target="_blank" rel="noreferrer" className="-mt-2 text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink">
          {p.keyUrlLabel}
        </a>
      )}
    </div>
  );
}

export function KeyNotice() {
  return <p className="text-[13px] leading-relaxed text-ink-3">{KEY_NOTICE} 키는 암호화해 저장하고, 평가를 요청할 때만 해당 AI 회사로 보냅니다.</p>;
}
