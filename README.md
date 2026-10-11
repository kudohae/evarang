# 에바랑 — OPIc 모의고사

실제 OPIc 진행 순서(Background Survey → Self Assessment → Pre-Test Setup → Sample Question → 본 시험 → 난이도 재조정)를 그대로 따르는 모의고사입니다. 답변은 AssemblyAI로 군말까지 받아쓰고, 선택한 모델이 ACTFL 기준으로 등급과 문항별 첨삭을 만듭니다. 발음은 평가하지 않습니다.

## Vercel 배포

1. [vercel.com](https://vercel.com)에 GitHub 계정으로 가입합니다.
2. **Add New → Project**에서 `kudohae/evarang` 저장소를 Import 합니다.
3. **Environment Variables**에 아래 값을 넣습니다. 쓰지 않는 모델의 키는 비워두면 선택지에서 비활성화됩니다.

   | 이름 | 필수 | 설명 |
   |---|---|---|
   | `ACCESS_CODE` | 예 | 사이트 접근 코드. 비워두면 주소를 아는 누구나 내 API 키로 비용을 쓸 수 있습니다. |
   | `ASSEMBLYAI_API_KEY` | 예 | 음성인식 |
   | `GEMINI_API_KEY` | | Gemini 3.5 Flash-Lite / 3.8 Flash (무료 등급) |
   | `XAI_API_KEY` | | Grok (유료) |
   | `ANTHROPIC_API_KEY` | | Claude Haiku / Sonnet / Opus |
   | `GROQ_API_KEY` | | Llama 3.3 70B (무료 등급) |

4. **Deploy**를 누릅니다. 이후 연결된 브랜치에 push할 때마다 자동으로 다시 배포됩니다.

Vercel의 Production 브랜치는 기본적으로 `main`입니다. 이 작업 브랜치를 `main`에 합치거나, 프로젝트 Settings → Git에서 Production Branch를 바꾸세요.

> Vercel Hobby(무료) 플랜은 비상업적 용도만 허용합니다. 유료화할 때는 Pro 플랜으로 바꿔야 합니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev                  # http://localhost:3000
```

마이크 녹음은 HTTPS 또는 localhost에서만 동작합니다.

## 구조

```
src/
  app/                    페이지와 API 라우트
    api/transcribe        녹음 → AssemblyAI (Universal-3.5 Pro, disfluencies: true)
    api/evaluate/*        문항별 첨삭(5문항씩 묶음), 종합 판정
    api/access            접근 코드 확인 → httpOnly 쿠키
  components/exam/        시험 화면 (설문, 자가평가, 장비 점검, 문항, 재조정)
  components/report/      평가 보고서
  lib/content/            설문 항목, 자가평가 단계, 문항 은행 (설문 주제 25개, 돌발 주제 15개)
  lib/exam/compose.ts     출제 규칙
  lib/evaluation/         평가 기준 프롬프트와 응답 스키마
  lib/server/llm.ts       모델 공급자별 호출 (Anthropic, Gemini, Groq, xAI)
```

녹음과 결과는 사용자의 브라우저(IndexedDB)에만 저장됩니다. 서버는 받아쓰기와 평가 요청을 중계할 뿐 저장하지 않습니다.

## 출제 규칙의 근거

공식 사이트에서 확인한 것: 진행 순서, 질문 청취 2회(처음 + 다시 듣기 1회), 문항별 답변 시간 제한 없음, 12~15문항, 시험 40분, 7번 뒤 난이도 재조정.

수험생 자료가 대체로 일치하는 것: 난이도 1~2는 12문항·3~6은 15문항, Q1 자기소개 채점 제외, Q2~10 콤보, Q11~13 롤플레이, Q14~15 어드밴스(5~6단계).

자료마다 엇갈려 다수 의견을 따른 것: 다시 듣기는 질문이 끝난 뒤 5초 안에만 가능, 질문이 끝나면 바로 녹음 시작, 3~4단계의 Q14~15는 비교 + 질문하기.

규칙은 `src/lib/exam/compose.ts`와 `src/components/exam/QuestionStage.tsx`(`REPLAY_WINDOW_MS`)에 모여 있습니다.

## 한계

- 예상 등급은 공식 결과가 아닙니다.
- 질문 음성은 브라우저 내장 TTS라 실제 시험의 Ava 목소리와 다릅니다. Edge나 macOS Safari의 자연스러운 음성이 가장 낫습니다.
- 음성인식이 확신하지 못한 단어는 보고서에 따로 표시하지만, 이는 발음 평가가 아닙니다.
- Self Assessment·Survey 문구는 실제 시험을 본뜬 것입니다. 유료 서비스로 공개하기 전에 문구와 서비스 이름(OPIc은 ACTFL의 상표)을 검토해야 합니다.
