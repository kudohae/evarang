"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { Frame } from "@/components/exam/Frame";
import { SELF_LEVELS } from "@/lib/content/levels";
import { resolveVoice, speak, useVoices, type Speech } from "@/lib/client/audio";
import type { Level } from "@/lib/types";

export function SelfAssessment({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: Level | null;
  onChange: (l: Level) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const voices = useVoices();
  const [playing, setPlaying] = useState<Level | null>(null);
  const speech = useRef<Speech | null>(null);

  useEffect(() => () => speech.current?.cancel(), []);

  const toggleSample = (level: Level, text: string) => {
    speech.current?.cancel();
    if (playing === level) {
      setPlaying(null);
      return;
    }
    setPlaying(level);
    const s = speak(text, resolveVoice(voices), 0.95);
    speech.current = s;
    void s.done.then(() => setPlaying((p) => (p === level ? null : p)));
  };

  return (
    <Frame
      step={1}
      title="Self Assessment"
      lead="본인의 영어 말하기 수준과 가장 가까운 설명을 고르세요. 고른 단계에 따라 문항의 난이도와 개수가 달라집니다."
      aside={value ? `${value}단계 선택` : "단계를 선택하세요"}
      actions={
        <>
          <Button variant="quiet" onClick={onBack}>
            <Icon name="back" className="size-4" />
            이전
          </Button>
          <Button onClick={onNext} disabled={!value}>
            다음
            <Icon name="arrow" className="size-4" />
          </Button>
        </>
      }
    >
      <div className="-mx-4 flex flex-col gap-1" role="radiogroup">
        {SELF_LEVELS.map(({ level, text, sample }) => {
          const checked = value === level;
          return (
            <div
              key={level}
              className={`flex items-start gap-4 rounded-ctl px-4 py-4 transition-colors ${checked ? "bg-wash" : "hover:bg-wash/60"}`}
            >
              <label className="flex flex-1 cursor-pointer items-start gap-4">
                <input type="radio" name="level" checked={checked} onChange={() => onChange(level)} className="peer sr-only" />
                <span
                  className={`tabular mt-px flex size-7 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${
                    checked ? "bg-ink text-paper" : "border-[1.5px] border-line-strong text-ink-2"
                  }`}
                >
                  {level}
                </span>
                <span className="text-[15px] leading-[1.65]">{text}</span>
              </label>
              <button
                type="button"
                onClick={() => toggleSample(level, sample)}
                className={`mt-0.5 flex h-8 shrink-0 items-center gap-1.5 rounded-ctl px-2.5 text-[13px] transition-colors ${
                  playing === level ? "text-ink" : "text-ink-3 hover:text-ink"
                }`}
                aria-label={`${level}단계 샘플 답변 듣기`}
              >
                <Icon name={playing === level ? "stop" : "speaker"} className="size-4" />
                <span className="hidden sm:inline">{playing === level ? "정지" : "샘플"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
