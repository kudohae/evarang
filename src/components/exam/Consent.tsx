"use client";

import { useConfig } from "@/components/AccessGate";
import { Frame } from "@/components/exam/Frame";
import { Button, ChoiceRow, Icon } from "@/components/ui";

export type ConsentAnswers = { transfer: boolean; age: boolean; research: boolean };

const PROCESSORS = [
  ["AssemblyAI", "미국", "녹음 받아쓰기"],
  ["Google (Gemini)", "미국 등", "평가, 보조 받아쓰기"],
  ["Groq", "미국", "평가 (Gemini 무료 한도를 다 쓴 날)"],
] as const;

function Box({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <section className="rounded-panel border border-line bg-surface px-5 py-5 md:px-6">
      <h2 className="flex items-baseline gap-2 text-[16px] font-semibold">
        {title}
        <span className="text-[13px] font-normal text-ink-3">{tag}</span>
      </h2>
      <div className="mt-3 text-[14px] leading-[1.7] text-ink-2">{children}</div>
    </section>
  );
}

/** Shown before the survey: survey answers are the first thing collected. */
export function Consent({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: ConsentAnswers;
  onChange: (v: ConsentAnswers) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const config = useConfig();
  const set = (patch: Partial<ConsentAnswers>) => onChange({ ...value, ...patch });

  return (
    <Frame
      step={null}
      title="개인정보 수집·이용 동의"
      lead={
        <>
          시험을 시작하기 전에 확인해 주세요. 전문은{" "}
          <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4">
            개인정보 처리방침
          </a>
          에 있습니다.
        </>
      }
      aside={value.transfer && value.age ? "필수 항목에 동의했습니다" : "필수 항목에 동의해야 시작할 수 있습니다"}
      actions={
        <>
          <Button variant="quiet" onClick={onBack}>
            <Icon name="back" className="size-4" />
            이전
          </Button>
          <Button onClick={onNext} disabled={!value.transfer || !value.age}>
            다음
            <Icon name="arrow" className="size-4" />
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Box title="받아쓰기와 평가를 위한 해외 전송" tag="필수">
          <p>답변 녹음과 받아쓴 글은 아래 해외 서비스로 전송되어 처리됩니다. 처리가 끝난 데이터의 보관은 각 업체의 정책을 따릅니다. Gemini 무료 등급으로 처리한 내용은 Google의 제품 개선에 쓰일 수 있습니다.</p>
          <table className="mt-3 w-full text-left text-[13px]">
            <thead className="text-ink-3">
              <tr>
                <th className="py-1.5 font-medium">받는 곳</th>
                <th className="py-1.5 font-medium">국가</th>
                <th className="py-1.5 font-medium">목적</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {PROCESSORS.map(([who, where, why]) => (
                <tr key={who} className="border-t border-line">
                  <td className="py-1.5 pr-3">{who}</td>
                  <td className="py-1.5 pr-3">{where}</td>
                  <td className="py-1.5">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3">전송 시점은 시험 중과 평가할 때입니다. 동의하지 않으면 받아쓰기와 평가를 할 수 없어 시험을 볼 수 없습니다.</p>
          <div className="-mx-4 mt-3 flex flex-col gap-0.5">
            <ChoiceRow type="checkbox" checked={value.transfer} onChange={() => set({ transfer: !value.transfer })}>
              위 내용에 동의합니다.
            </ChoiceRow>
            <ChoiceRow type="checkbox" checked={value.age} onChange={() => set({ age: !value.age })}>
              만 14세 이상입니다.
            </ChoiceRow>
          </div>
        </Box>

        {config.research && (
          <Box title="예측 개선을 위한 저장" tag="선택">
            <p>등급 예측과 문항을 더 정확하게 다듬는 데 쓰려고, 동의한 분의 기록만 저장합니다.</p>
            <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
              <dt className="text-ink-3">항목</dt>
              <dd className="text-ink">설문 답변, 답변 녹음, 받아쓴 글, 말하기 지표, 예상 등급과 평가 결과, 입력한 실제 OPIc 등급</dd>
              <dt className="text-ink-3">보유 기간</dt>
              <dd className="text-ink">저장한 날부터 2년. 기간이 지나면 자동으로 삭제합니다.</dd>
              <dt className="text-ink-3">삭제</dt>
              <dd className="text-ink">언제든 결과 보고서 아래의 “저장된 데이터 삭제”로 지울 수 있습니다.</dd>
            </dl>
            <p className="mt-3">동의하지 않아도 시험과 평가는 똑같이 이용할 수 있습니다.</p>
            <div className="-mx-4 mt-3">
              <ChoiceRow type="checkbox" checked={value.research} onChange={() => set({ research: !value.research })}>
                예측 개선을 위한 저장에 동의합니다.
              </ChoiceRow>
            </div>
          </Box>
        )}
      </div>
    </Frame>
  );
}
