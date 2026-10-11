"use client";

import { useConfig } from "@/components/AccessGate";
import { ChoiceRow } from "@/components/ui";
import { MODELS } from "@/lib/models";

const PREF_KEY = "evarang.model";
const PRIORITY = ["claude-opus-5-5", "claude-sonnet-5-5", "gemini-3.8-flash", "gemini-3.5-flash-lite", "claude-haiku-5-5", "xai-grok", "groq-llama"];

export function preferredModel(available: string[]): string | undefined {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(PREF_KEY);
  } catch {}
  if (saved && available.includes(saved)) return saved;
  return PRIORITY.find((id) => available.includes(id));
}

export function rememberModel(id: string) {
  try {
    localStorage.setItem(PREF_KEY, id);
  } catch {}
}

export function ModelPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const config = useConfig();
  const available = new Set(config.models.filter((m) => m.available).map((m) => m.id));
  return (
    <div className="-mx-4 flex flex-col gap-0.5" role="radiogroup">
      {MODELS.map((m) => {
        const ok = available.has(m.id);
        return (
          <ChoiceRow key={m.id} type="radio" checked={value === m.id} onChange={() => onChange(m.id)} disabled={!ok}>
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold">{m.label}</span>
              <span className="text-[13px] text-ink-3">{m.tier}</span>
            </span>
            <span className="mt-0.5 block text-[14px] text-ink-2">{ok ? m.note : "서버에 이 모델의 API 키가 없습니다."}</span>
          </ChoiceRow>
        );
      })}
    </div>
  );
}
