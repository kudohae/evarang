"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon, Spinner } from "@/components/ui";
import { Frame } from "@/components/exam/Frame";
import { FallbackNotice } from "@/components/FallbackNotice";
import { transcribeBlob } from "@/lib/client/transcribe";
import type { FallbackReason } from "@/lib/types";
import { Recorder, requestMic, resolveVoice, saveVoiceName, speak, useMicLevel, useVoices, type Speech } from "@/lib/client/audio";
import { SETUP_PROMPT } from "@/lib/content/levels";

const TEST_SECONDS = 8;

function LevelBar({ level }: { level: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
      <div className="h-full rounded-full bg-ink transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
    </div>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 text-[17px] font-semibold">
        <span className={`tabular flex size-6 items-center justify-center rounded-full text-[13px] ${done ? "bg-primary text-primary-ink" : "border-[1.5px] border-line-strong text-ink-2"}`}>
          {done ? (
            <svg viewBox="0 0 12 12" className="size-[11px]" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2.5 6.2 5 8.5l4.5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            n
          )}
        </span>
        {title}
      </h2>
      <div className="mt-4 pl-9">{children}</div>
    </section>
  );
}

export function Setup({
  stream,
  onStream,
  onNext,
  onBack,
  onFallback,
}: {
  stream: MediaStream | null;
  onStream: (s: MediaStream) => void;
  /** Called when the check had to use the backup recogniser, so the test does not announce it again. */
  onFallback: (reason: FallbackReason) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const voices = useVoices();
  const [voiceName, setVoiceName] = useState<string>("");
  const [heard, setHeard] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [micError, setMicError] = useState("");
  const [recState, setRecState] = useState<"idle" | "recording" | "done">("idle");
  const [left, setLeft] = useState(TEST_SECONDS);
  const [testUrl, setTestUrl] = useState("");
  const [check, setCheck] = useState<{ status: "idle" | "checking" | "ok" | "error"; text?: string; error?: string }>({ status: "idle" });
  const [notice, setNotice] = useState<FallbackReason | null>(null);
  const speech = useRef<Speech | null>(null);
  const recorder = useRef<Recorder | null>(null);
  const level = useMicLevel(stream);

  useEffect(() => {
    if (!voiceName && voices.length) setVoiceName(resolveVoice(voices)?.name ?? "");
  }, [voices, voiceName]);

  useEffect(() => () => speech.current?.cancel(), []);
  useEffect(() => () => void (testUrl && URL.revokeObjectURL(testUrl)), [testUrl]);

  const playSample = () => {
    speech.current?.cancel();
    setSpeaking(true);
    const s = speak(`Hello, I'm Ava. ${SETUP_PROMPT}`, voices.find((v) => v.name === voiceName));
    speech.current = s;
    void s.done.then(() => {
      setSpeaking(false);
      setHeard(true);
    });
  };

  const connect = async () => {
    setMicError("");
    try {
      onStream(await requestMic());
    } catch {
      setMicError("마이크를 사용할 수 없습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용한 뒤 다시 시도하세요.");
    }
  };

  const recordTest = async () => {
    if (!stream) return;
    const r = new Recorder(stream);
    recorder.current = r;
    r.start();
    setRecState("recording");
    for (let s = TEST_SECONDS; s > 0; s--) {
      setLeft(s);
      await new Promise((res) => setTimeout(res, 1000));
      if (recorder.current !== r) return;
    }
    const { blob, durationMs } = await r.stop();
    setTestUrl(URL.createObjectURL(blob));
    setRecState("done");
    // Run the test recording through the real recogniser, so a broken key or used-up credit shows now, not after 40 minutes.
    setCheck({ status: "checking" });
    try {
      const { transcript, fallback } = await transcribeBlob(blob, durationMs);
      setCheck({ status: "ok", text: transcript.text });
      if (fallback) {
        setNotice(fallback);
        onFallback(fallback);
      }
    } catch (e) {
      setCheck({ status: "error", error: (e as Error).message });
    }
  };

  return (
    <Frame
      step={2}
      title="Pre-Test Setup"
      lead="시험 중에는 질문이 음성으로만 나옵니다. 소리와 마이크를 먼저 확인하세요."
      aside={!stream ? "마이크 연결이 필요합니다" : check.status === "ok" ? "준비되었습니다" : "녹음 테스트가 필요합니다"}
      actions={
        <>
          <Button variant="quiet" onClick={onBack}>
            <Icon name="back" className="size-4" />
            이전
          </Button>
          <Button onClick={onNext} disabled={!stream || recState === "recording" || check.status !== "ok"}>
            다음
            <Icon name="arrow" className="size-4" />
          </Button>
        </>
      }
    >
      <Step n={1} title="소리 확인" done={heard}>
        <p className="text-[15px] leading-relaxed text-ink-2">재생을 누르고 질문 음성이 잘 들리는지 확인하세요. 목소리는 브라우저에 설치된 음성 중에서 고를 수 있습니다.</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={playSample} disabled={speaking}>
            <Icon name={speaking ? "speaker" : "play"} className="size-4" />
            {speaking ? "재생 중" : "재생"}
          </Button>
          {voices.length > 1 && (
            <select
              value={voiceName}
              onChange={(e) => {
                setVoiceName(e.target.value);
                saveVoiceName(e.target.value);
              }}
              className="h-11 max-w-full rounded-ctl border border-line-strong bg-surface px-3 text-[14px] text-ink"
              aria-label="질문 음성"
            >
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </Step>

      <Step n={2} title="마이크와 받아쓰기 확인" done={check.status === "ok"}>
        {!stream ? (
          <>
            <p className="text-[15px] leading-relaxed text-ink-2">답변은 녹음되어 받아쓰기와 평가에만 쓰입니다. 녹음 파일은 이 브라우저에만 저장됩니다.</p>
            <Button className="mt-5" variant="secondary" onClick={connect}>
              <Icon name="mic" className="size-4" />
              마이크 연결
            </Button>
            {micError && <p className="mt-3 text-[14px] text-pen-ink">{micError}</p>}
          </>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed text-ink-2">
              말을 하면 아래 막대가 움직입니다. 녹음 테스트를 누르고 {TEST_SECONDS}초 동안 영어로 아무 말이나 해보세요. 받아쓴 결과가 나오면 시험을 시작할 수 있습니다.
            </p>
            <div className="mt-5 max-w-[360px]">
              <LevelBar level={level} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={recordTest} disabled={recState === "recording" || check.status === "checking"}>
                {recState === "recording" ? (
                  <>
                    <span className="size-2 animate-pulse rounded-full bg-pen" />
                    <span className="tabular">녹음 중 {left}</span>
                  </>
                ) : (
                  <>
                    <Icon name="mic" className="size-4" />
                    {recState === "done" ? "다시 녹음" : "녹음 테스트"}
                  </>
                )}
              </Button>
              {testUrl && <audio src={testUrl} controls className="h-11" />}
            </div>
            <div className="mt-5 min-h-6 text-[15px] leading-relaxed" aria-live="polite">
              {check.status === "checking" && (
                <span className="inline-flex items-center gap-2 text-ink-2">
                  <Spinner /> 받아쓰는 중
                </span>
              )}
              {check.status === "ok" &&
                (check.text ? (
                  <p>
                    <span className="text-ink-2">받아쓴 내용 </span>
                    <span lang="en">“{check.text}”</span>
                  </p>
                ) : (
                  <p className="text-ink-2">말소리가 들리지 않았습니다. 받아쓰기는 동작하니 진행해도 되지만, 마이크 위치를 확인하고 한 번 더 녹음해 보길 권합니다.</p>
                ))}
              {check.status === "error" && (
                <div className="text-pen-ink">
                  <p className="font-semibold">받아쓰기가 동작하지 않아 시험을 시작할 수 없습니다.</p>
                  <p className="mt-1">{check.error}</p>
                </div>
              )}
            </div>
          </>
        )}
      </Step>
      {notice && <FallbackNotice reason={notice} during="setup" onClose={() => setNotice(null)} />}
    </Frame>
  );
}
