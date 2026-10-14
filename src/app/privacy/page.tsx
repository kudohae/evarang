import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { CONSENT_VERSION } from "@/lib/exam/result";

export const metadata: Metadata = { title: "개인정보 처리방침 — 에바랑" };

// Filled from environment variables so the operator can set them in Vercel without touching code.
const OPERATOR = process.env.PRIVACY_OPERATOR || "[운영자 이름]";
const CONTACT = process.env.PRIVACY_CONTACT || "[연락처 이메일]";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-12 text-[18px] font-bold tracking-[-0.01em]">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-[720px] px-5 pb-28 pt-10 text-[15px] leading-[1.8] text-ink-2">
        <h1 className="text-[28px] font-bold tracking-[-0.02em] text-ink">개인정보 처리방침</h1>
        <p className="mt-3">
          {OPERATOR}(이하 “운영자”)는 에바랑 서비스를 운영하면서 이용자의 개인정보를 아래와 같이 처리합니다. 시행일: {CONSENT_VERSION}
        </p>

        <H>1. 처리하는 개인정보와 목적</H>
        <ul className="mt-3 list-disc pl-5">
          <li>
            <b className="text-ink">시험 진행과 평가 (필수)</b>: 답변 녹음, 받아쓴 글. 받아쓰기와 평가 결과를 만들기 위해 처리합니다. 아래의 저장에 동의하지 않았다면 운영자의 서버는 이 정보를 저장하지 않고 처리 업체에 전달만 하며, 녹음과
            결과는 이용자의 브라우저에 저장됩니다.
          </li>
          <li className="mt-2">
            <b className="text-ink">예측 개선 (선택, 동의한 경우만)</b>: 설문 답변, 답변 녹음, 받아쓴 글, 말하기 지표, 예상 등급과 평가 결과, 이용자가 입력한 실제 OPIc 등급. 등급 예측과
            문항의 품질을 개선하기 위해 저장하고 분석합니다.
          </li>
          <li className="mt-2">
            <b className="text-ink">회원 가입 (가입한 경우만)</b>: 이메일, 닉네임, 비밀번호. 회원을 식별하고 로그인을 처리하기 위해 저장합니다. 비밀번호는 복원할 수 없는 형태(scrypt 해시)로만
            저장합니다.
          </li>
          <li className="mt-2">
            <b className="text-ink">계정에 시험 기록 저장 (회원이 동의한 경우만)</b>: 설문 답변, 답변 녹음, 받아쓴 글, 말하기 지표, 평가 결과, 입력한 실제 OPIc 등급. 다른 기기에서도 기록을 볼 수
            있도록 저장합니다.
          </li>
          <li className="mt-2">
            <b className="text-ink">접속 관리</b>: 접근 코드 확인용 쿠키, 로그인 상태를 유지하는 쿠키(최대 30일). 로그인 남용을 막기 위해 접속 IP를 짧은 기간 동안 시도 횟수와 함께 기록합니다. 사용량 확인을 위해 IP의 해시값을 90일 보관합니다.
          </li>
        </ul>
        <p className="mt-3">실명, 전화번호 같은 신원 정보는 받지 않습니다. 다만 녹음에 담긴 목소리와 답변 내용으로 개인이 식별될 수 있습니다.</p>

        <H>2. 보유 기간과 파기</H>
        <p className="mt-3">
          회원 정보는 탈퇴할 때까지 보유하고, 탈퇴하면 즉시 삭제합니다. 계정에 저장한 시험 기록과 녹음은 회원이 저장을 끄거나 탈퇴하면 즉시 삭제합니다. 예측 개선용으로 저장한 기록은 저장한 날부터 2년간 보유하고, 기간이 지나면 매일 자동으로 녹음과 함께 삭제합니다. 이용자가 삭제를 요청하면 즉시 삭제합니다. 이용자 브라우저에 저장된 기록은 이용자가
          브라우저 데이터를 지우면 삭제됩니다.
        </p>

        <H>3. 처리 위탁과 국외 이전</H>
        <p className="mt-3">받아쓰기, 평가, 저장을 위해 아래 업체에 처리를 맡기며, 이 과정에서 개인정보가 국외로 전송됩니다. 전송은 시험 중과 평가 시 암호화된 통신으로 이루어집니다.</p>
        <table className="mt-3 w-full text-left text-[14px]">
          <thead className="text-ink-3">
            <tr>
              <th className="py-2 font-medium">업체</th>
              <th className="py-2 font-medium">국가</th>
              <th className="py-2 font-medium">위탁 업무</th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {[
              ["AssemblyAI, Inc.", "미국", "녹음 받아쓰기"],
              ["Google LLC (Gemini API)", "미국 등", "평가, 보조 받아쓰기"],
              ["Groq, Inc.", "미국", "평가 (Gemini 무료 한도를 다 쓴 날)"],
              ["Vercel Inc.", "미국 등", "서비스 운영, 녹음 저장 (Blob)"],
              ["Neon (Databricks, Inc.)", "선택한 리전", "회원 정보, 예측 개선용 기록 저장 (Postgres)"],
            ].map(([a, b, c]) => (
              <tr key={a} className="border-t border-line">
                <td className="py-2 pr-3">{a}</td>
                <td className="py-2 pr-3">{b}</td>
                <td className="py-2">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">평가 업체는 이용자가 고른 모델의 업체에만 전송됩니다. 각 업체의 보관 기간은 해당 업체의 정책을 따르며, Gemini 무료 등급으로 처리한 내용은 Google의 제품 개선에 쓰일 수 있습니다.</p>

        <H>4. 이용자의 권리</H>
        <p className="mt-3">
          이용자는 언제든 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 예측 개선용 기록은 결과 보고서 아래의 “저장된 데이터 삭제”로 직접 지울 수 있고, 그렇게 할 수 없는 경우 기록
          번호와 함께 아래 연락처로 요청하면 처리합니다. 선택 동의를 거부해도 서비스 이용에는 제한이 없습니다.
        </p>

        <H>5. 만 14세 미만 아동</H>
        <p className="mt-3">이 서비스는 만 14세 이상만 이용할 수 있으며, 만 14세 미만 아동의 개인정보를 알면서 수집하지 않습니다.</p>

        <H>6. 안전성 확보 조치</H>
        <p className="mt-3">
          저장한 녹음은 비공개 저장소에 두어 주소만으로는 열람할 수 없게 하고, 관리 화면은 별도의 관리자 코드로 접근을 제한합니다. 저장된 기록은 작성한 이용자의 브라우저에 보관된 비밀 값으로만 수정·삭제할 수
          있습니다.
        </p>

        <H>7. 개인정보 보호책임자</H>
        <p className="mt-3">
          성명: {OPERATOR}
          <br />
          연락처: {CONTACT}
        </p>

        <H>8. 변경</H>
        <p className="mt-3">이 방침이 바뀌면 시행 7일 전에 이 페이지에 알립니다.</p>
      </main>
    </AppShell>
  );
}
