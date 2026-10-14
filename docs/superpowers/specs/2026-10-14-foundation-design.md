# 기반 공사 설계 (2026-10-14)

첨삭노트, 맞춤형 연습(문항별·주제별), 문장 구조화 연습, 스토리뱅크를 붙이기 전에 까는 공통 기반.

## 1. 목표와 범위

**목표.** 다음 기능을 만들 때 새 표, 새 동기화 코드, 새 녹음·받아쓰기 코드 없이 화면과 그 기능의 로직만 쓰면 되게 한다. 유지보수와 확장을 우선한다.

**성공 기준.**
- 모의고사가 사용자 입장에서 지금과 똑같이 동작한다. 다만 사용량 한도(5절)만 새로 생긴다.
- 기존 기록(브라우저, 계정, 예측 개선용)이 그대로 열린다.
- 새 기능 하나는 "종류 등록부에 한 줄 + 렌즈 몇 개 + 행동 한 줄 + 기능 등록부에 한 줄 + 화면"으로 시작할 수 있다.
- 저장소에 자동 시험(단위·흐름)이 생기고, 모의고사 흐름 시험이 통과한다.

**범위 밖.** 네 기능의 화면과 기능 로직, 노트 카드·이야기의 데이터 모양, 지갑·결제, 소셜 로그인, 비밀번호 찾기. 홈 메뉴의 "준비 중" 항목은 그대로 둔다.

**정한 것.**
| 질문 | 결정 |
|---|---|
| 저장 통합 범위 | 전부 통합. `user_exams`도 `user_docs`로 옮긴다 |
| 비회원 범위 | 지금은 브라우저 우선(계정은 동의 시 동기화). 나중에 모든 기능 로그인 필수(계정 우선)로 바꾼다 |
| 사용량 | 행동별 하루 무료 횟수. 나중에 크레딧 구매·차감으로 바꾼다 |
| 모의고사 데이터 | 어댑터 방식. `ExamResult`는 그대로 두고 공통 시도 목록으로 바꿔 읽는다 |

## 2. 폴더 구조

```
src/lib/domain/     skills.ts, attempt.ts, session.ts, from-exam.ts
src/lib/docs/       kinds.ts, local.ts, account.ts, sync.ts, policy.ts
src/lib/capture/    policy.ts, useAnswerCapture.ts, useMicrophone.ts, pipeline.ts
src/lib/feedback/   lenses.ts, prompt.ts, schema.ts, ladder.ts   (lib/evaluation 흡수)
src/lib/metering/   actions.ts, meter.ts (서버)
src/lib/features.ts 기능 등록부
src/lib/http.ts     브라우저 요청·오류 해석
src/components/AppShell.tsx
```

## 3. 데이터 모양

### 3.1 약점 이름표 (`domain/skills.ts`)
id는 영구 고정이고 화면 이름은 바꿀 수 있다.

| 묶음 | id → 이름 |
|---|---|
| structure | `structure.opening` 바로 답하기, `structure.reason` 이유, `structure.example` 예시·경험, `structure.closing` 생각·감정으로 마무리 |
| tense | `tense.past` 과거 시제, `tense.consistency` 시제 일관성 |
| grammar | `grammar.agreement` 주어-동사 일치, `grammar.article` 관사, `grammar.preposition` 전치사, `grammar.plural` 복수형, `grammar.word_order` 어순 |
| vocab | `vocab.repetition` 같은 말 반복, `vocab.precision` 정확한 단어 선택 |
| cohesion | `cohesion.connectors` 연결어, `cohesion.sentence_variety` 문장 길이 |
| fluency | `fluency.fillers` 군말, `fluency.pauses` 긴 멈춤 |
| task | `task.questions` 질문하기, `task.problem_solving` 문제 해결, `task.comparison` 비교·변화, `task.description` 구체적 묘사 |

각 항목은 `{ id, group, label, definition }`이다. `definition`은 AI 프롬프트에 그대로 들어간다.

### 3.2 시도 (`domain/attempt.ts`)
```ts
type AttemptSource = "exam" | "drill" | "structure" | "review" | "story";
type Attempt = {
  id: string;                 // 모의고사는 `${examId}:${number}`
  sessionId: string;
  source: AttemptSource;
  createdAt: number;
  question: { text: string; type: QuestionType; topicId?: string; number?: number };
  recording?: { audioKey: string; mimeType: string; durationMs: number };
  transcript?: Transcript;    // 지금 형식 그대로
  feedback?: AnswerFeedback;  // 4.3
  modelId?: string;
};
```

### 3.3 세션 (`domain/session.ts`)
```ts
type SessionKind = "drill" | "structure" | "review" | "story-drill";
type Session = { id: string; kind: SessionKind; createdAt: number; settings: Record<string, unknown>; attempts: Attempt[] };
```
`settings`의 구체 모양은 각 기능이 정한다.

### 3.4 모의고사 어댑터 (`domain/from-exam.ts`)
`attemptsFromExam(result, evaluationId?)`가 `ExamResult`의 문항·답변·지정한 평가(없으면 최신)를 시도 목록으로 바꾼다. 이름표가 없는 옛 평가는 `skills: []`, 교정의 `skill`은 비어 있다("분류 안 됨").

## 4. 저장과 동기화

### 4.1 봉투와 종류 등록부
```ts
type Doc<T> = { kind: DocKind; id: string; updatedAt: number; deletedAt?: number; data: T };
type DocKind = "exam" | "session" | "note" | "story";
```
`docs/kinds.ts`에 종류마다 `summary(data)`(목록용 작은 객체), `maxBytes`, `hasAudio`를 적는다. `note`, `story`는 이름만 예약하고 `data`는 그 기능에서 정한다.

### 4.2 브라우저 (`docs/local.ts`)
- IndexedDB 2판. 기존 `audio`, `results`는 그대로 두고 `docs`(키 `${kind}:${id}`), `sync`(키 같음) 저장소를 더한다.
- `exam` 종류는 `results` 저장소를 읽고 쓴다. 기록을 옮기지 않는다. `ExamResult`에 `updatedAt`을 더하고, 없는 옛 기록은 `createdAt`으로 읽는다.
- 동기화 장부(`sync`): `{ pushedVersion?, syncedAt?, uploaded: string[], error? }`. `pushedVersion`은 마지막으로 보낸 기록의 `updatedAt`이다. 지금 `ExamResult.account`에 든 값은 처음 열 때 `sync`로 옮기고 지운다. 서버로 보낼 때 떼어낼 로컬 필드는 `research`만 남는다.
- 인터페이스: `get(kind,id)`, `put(doc)`, `remove(kind,id)`(삭제 표시), `list(kind)`, `audio.get/put(key)`.

### 4.3 서버 (`user_docs`)
```sql
CREATE TABLE user_docs (
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  kind text, id text,
  updated_at timestamptz NOT NULL, deleted_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}', data jsonb, audio jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (user_id, kind, id)
);
```
- API: `GET /api/me/docs?kind=`(요약·삭제 표시), `GET|PUT|DELETE /api/me/docs/{kind}/{id}`, `GET|PUT /api/me/docs/{kind}/{id}/audio/{key}`.
- 녹음 경로: `users/{userId}/{kind}/{id}/{key}.{ext}`. 이사한 모의고사 녹음은 옛 경로(`users/{userId}/exams/{id}/{n}`)를 그대로 가리킨다.
- **이사:** 표를 만드는 초기화에서 `INSERT INTO user_docs SELECT … FROM user_exams ON CONFLICT DO NOTHING`. 여러 번 돌아도 안전하다. `user_exams`는 한동안 남기고 쓰지 않는다. `/api/me/exams`는 지운다.
- 계정 저장 끄기·탈퇴는 그 회원의 `user_docs`와 녹음을 모두 지운다(지금과 같은 동작).

### 4.4 충돌과 삭제
- `PUT`은 본문의 `updatedAt`이 서버 값보다 오래되면 409와 함께 서버 사본을 돌려준다. 브라우저는 그 사본으로 덮어쓴다(나중에 고친 쪽이 이김).
- `DELETE`는 `deleted_at`을 남기고 `data`와 녹음을 지운다. 다른 기기는 목록에서 삭제 표시를 보고 자기 사본을 지운다.

### 4.5 동기화 엔진 (`docs/sync.ts`)
- 계정 저장에 동의한 회원만 돈다. 동의 하나가 exam·session·note를 덮는다. story는 그 기능에서 따로 안내한다.
- 시점: 홈 진입, 로그인 직후, 기록 저장 직후(같은 기록은 1초 몰아서 한 번).
- 보내기: 로컬 `updatedAt` > `pushedVersion`이면 보내고, 올리지 않은 녹음을 올린다(저장소가 없으면 503을 받고 건너뛴다).
- 받기: 목록은 요약만 받는다. 내용은 열 때 받고 로컬에 사본을 둔다. 녹음은 재생할 때 받는다.

### 4.6 정책 (`docs/policy.ts`)
`STORAGE_POLICY = "local-first" | "account-first"`. 지금은 `local-first`다. `account-first`는 로그인을 요구하고, 읽기를 서버에서 먼저 하고, 브라우저를 캐시로 쓴다. 기능 코드는 저장소 인터페이스만 쓰므로 바뀌지 않는다.

예측 개선용 기록(`exam_records`, `/api/records`)과 관리자 화면은 손대지 않는다.

## 5. 답변 받기 엔진

- **정책 (`capture/policy.ts`)**
  - `EXAM_POLICY`: 다시 듣기 질문 끝나고 5초 안에 1번, 질문 글자 숨김, 다시 말하기 없음.
  - `PRACTICE_POLICY`: 다시 듣기 무제한, 질문 글자 보기 버튼, 다시 말하기 있음.
  - `REPLAY_WINDOW_MS`는 `EXAM_POLICY`로 옮기고 README의 출제 규칙 근거를 고친다.
- **`useAnswerCapture({ text, voice, stream, policy })`**: 단계(ready/playing/answering/saving), 마이크 크기, 경과 시간, 다시 듣기 가능 여부와 남은 초, `play()`, `replay()`, `submit()`, `retry()`를 준다. 녹음이 끝나면 `Recording`을 넘긴다.
- **`useMicrophone()`**: 권한 요청, 스트림 유지, 해제. Setup과 ExamApp에 흩어진 코드를 모은다.
- **`keepAndTranscribe(recording, audioKey)`**: 브라우저 저장 → 받아쓰기(AssemblyAI → Gemini) → 단어 시간 추정 → `{ transcript, fallback? }`. ExamApp의 받아쓰기 부분을 옮긴다.
- `QuestionStage`는 훅을 받아 그리는 부품이 된다. 모양은 그대로이고, 정책이 허용할 때만 "질문 보기"와 "다시 말하기"가 보인다. 40분 시간 제한은 ExamApp에 남는다.

## 6. 피드백 엔진

- **렌즈 (`feedback/lenses.ts`)**: `{ id, focus: SkillId[], instructions, weight: "full" | "light" }`.
  - 지금 만드는 것: `exam`, 유형별 10개(`type.intro` … `type.rp_experience`), 구조화 5개(`structure.opening`, `.reason`, `.example`, `.closing`, `.full`).
  - `light`는 무료 사다리를 Flash-Lite부터 탄다.
- **프롬프트 (`feedback/prompt.ts`)**: 공통 ACTFL 기준 + 이름표 정의 + 렌즈 지시 + 답변(받아쓴 글, 지표). 지금 모의고사 문항 프롬프트는 `exam` 렌즈로 옮기고 문구는 유지한다.
- **스키마 (`feedback/schema.ts`)**: `AnswerFeedback` = 지금의 `QuestionFeedback` + `skills: { skill: SkillId; verdict: "strong" | "weak" }[]` + `corrections[].skill?`, `upgrades[].skill?`. 종합 판정의 `patterns[].skill?`. 이름표는 JSON 스키마 enum으로 강제한다.
- **API**
  - `POST /api/feedback/answers { lens, context, items(1~8), model }` → `{ items, usage }`
  - `POST /api/feedback/overall` → 지금의 종합 판정.
  - `/api/evaluate/*`는 지운다. 두 API 모두 모델 호출 전에 `meter()`를 부른다.
- **사다리 (`feedback/ladder.ts`)**: 지금 `client/evaluate.ts`의 규칙(하루 한도 → 다음 모델, 아직 결과가 없으면 분당 한도 → 다음 모델, 일부 받았으면 기다림, 모두 분당 한도면 최선 모델에서 기다림, 한 세션은 한 모델)을 일반화한다. 시작 모델은 렌즈 무게로 정한다. 모의고사 평가(`evaluate.ts`)는 이 위에 얇게 남는다.

## 7. 사용량 장부

- **행동 등록부 (`metering/actions.ts`)**: `{ id, freePerDay: { anon, member }, credits }`.

| 행동 | 비회원 | 회원 | 단위 · 참조 |
|---|---|---|---|
| `exam.evaluate` | 1 | 2 | 시험 1 · examId |
| `feedback.answer` | 10 | 30 | 답 1 · attemptId |
| `feedback.light` | 30 | 100 | 답 1 · attemptId |
| `transcribe` | 40 | 120 | 녹음 1 · audioKey |
| `story.generate` | 0 | 3 | 1회 · 요청 id |

- **표 `usage_events(subject, action, ref, day, units, at)`**, `UNIQUE(subject, action, ref, day)`. `subject`는 `u:{userId}` 또는 `ip:{HMAC(IP)}`. `day`는 한국 시간 날짜다. 90일 지난 행은 기존 03:00 cron이 지운다.
- **`meter(action, units, ref)`**: 같은 참조는 한 번만 센다. 오늘 합계 + units가 무료 횟수를 넘으면 `429 { kind: "quota", remaining, resetAt }`. 크레딧은 이 함수 안의 한 분기(무료 초과 시 지갑 차감)로 들어온다. 지갑·결제 표는 만들지 않는다. `DATABASE_URL`이 없으면 세지 않고 통과한다.
- `GET /api/me/usage` → 행동별 남은 횟수.
- 한도 안내 문구: "오늘 무료 {행동}을 모두 썼습니다. 내일 0시에 다시 채워집니다." 평가 실패 안내와 같은 자리에 띄운다.
- 처리방침에 "사용량 확인을 위해 IP의 해시값을 90일 보관"을 더한다.

## 8. 공통 머리말과 기능 등록부

- **`lib/features.ts`**: `{ id, label, href, status: "open" | "soon", children? }` 목록(mock, notes, practice[문항별·주제별], structure, stories). 홈 메뉴와 머리말이 이 목록을 읽는다.
- **`AppShell`**: 왼쪽 워드마크, 가운데 열린 기능 링크(지금은 모의고사), 오른쪽 로그인·닉네임. 휴대폰에서는 링크가 아래 줄로 내려가 가로로 민다. 홈, 보고서, 가입·로그인·내 정보, 처리방침이 쓴다. 시험 진행 화면(`Frame`)과 관리자 화면은 그대로 둔다.

## 9. 오류 모양

모든 API 오류: `{ error: string, kind?: "rate" | "daily" | "quota" | "auth" | "invalid" | "conflict", retryAfter?: number, remaining?: number, resetAt?: string }`. `conflict`는 4.4의 409에 쓴다. 브라우저는 `lib/http.ts`의 `request()`로 부르고 이 모양을 해석한다. 서버는 공용 `apiError()`를 쓴다.

## 10. 검증

- **단위 시험 (Vitest, `npm test`)**: 이름표 목록(중복 없음, 모든 렌즈의 focus가 유효), `attemptsFromExam`(옛 평가·새 평가), 종류 등록부 요약, 동기화 판단(보낼지·받을지·삭제 표시), 사용량 하루 경계(한국 시간 자정), 모델 한도 오류 분류(분당·하루·0 한도).
- **흐름 시험 (Playwright, `npm run test:e2e`)**: 받아쓰기·피드백 API를 가짜 응답으로 바꾸고 모의고사를 동의 → 서베이 → 문항 → 대기실 → 보고서까지 통과. 다시 듣기 5초, 보조 음성인식 안내 타이밍을 확인한다.
- **수동 확인**: 실제 Gemini로 모의고사 한 번 평가(이름표 확인), 렌즈 3개 API 직접 호출, 로컬 Postgres + Neon 흉내 프록시(`scripts/neon-http-proxy.mjs`)로 `user_exams` → `user_docs` 이사와 두 기기 동기화.

## 11. 배포와 위험

- 한 번에 배포한다. IndexedDB 2판은 기존 저장소를 지우지 않는다. 서버 이사는 첫 요청 때 한 번 돌고 반복해도 안전하다.
- **위험 1. 리팩터링으로 모의고사 동작이 바뀔 수 있다.** 흐름 시험을 먼저 만들어 현재 동작을 고정한 뒤 나눈다.
- **위험 2. 이름표를 요구하면 무료 모델의 JSON 실패가 늘 수 있다.** 실제 모델로 확인하고, 실패가 늘면 `skills`를 선택 필드로 낮춘다.
- **위험 3. 사용량 한도가 생기면 지금 사용자가 막힐 수 있다.** 기본값은 등록부 한 곳에서 바꾼다.
