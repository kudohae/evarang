# 기반 공사 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첨삭노트·맞춤형 연습·구조화 연습·스토리뱅크가 올라설 공통 기반(이름표, 시도·세션, 렌즈 피드백, 사용량 장부, 문서 저장·동기화, 답변 받기 엔진, 공통 머리말)을 모의고사 동작을 바꾸지 않고 깐다.

**Architecture:** 모의고사 `ExamResult`는 그대로 두고 어댑터로 공통 시도 목록을 만든다. 저장은 종류 등록부(`exam | session | note | story`) 하나로 브라우저(IndexedDB 2판)와 계정(`user_docs`)을 다루고, 동기화 엔진이 둘을 잇는다. AI 호출은 렌즈로 조립한 프롬프트와 공용 사다리를 쓰고, 모든 비용 행동은 `meter()`를 거친다.

**Tech Stack:** Next.js 16.4 App Router, React 19, TypeScript 5.9, zod 4, Neon serverless(HTTP), Vercel Blob(private), IndexedDB. 새로 Vitest, fake-indexeddb, @playwright/test 1.56.

**Spec:** `docs/superpowers/specs/2026-10-14-foundation-design.md`

## Global Constraints

- 모의고사의 사용자 동작은 바뀌지 않는다. 예외는 사용량 한도뿐이다.
- 이름표 id는 스펙 3.1의 21개를 그대로 쓴다. 바꾸거나 지우지 않는다.
- 종류: `exam | session | note | story`. `note`, `story`의 `data` 모양은 정하지 않는다.
- 저장 정책 기본값은 `local-first`.
- 행동별 하루 무료 횟수(비회원/회원): `exam.evaluate` 1/2, `feedback.answer` 10/30, `feedback.light` 30/100, `transcribe` 40/120, `story.generate` 0/3.
- 사용량의 하루는 한국 시간(Asia/Seoul) 자정 기준이다. 사용 기록은 90일 보관한다.
- API 오류 모양: `{ error, kind?, retryAfter?, remaining?, resetAt? }`. kind는 `rate | daily | quota | auth | invalid | conflict`.
- 예측 개선용 기록(`exam_records`, `/api/records`, 관리자 화면)은 건드리지 않는다.
- 사용자에게 보이는 문구는 한국어, 지금 문체("~합니다")를 따른다.
- AGENTS.md: Next 16 규칙은 `node_modules/next/dist/docs/`를 확인한다(동적 라우트 `params`는 Promise).
- 모든 커밋 메시지 끝에 저장소 규칙의 Co-Authored-By / Claude-Session 줄을 붙인다.

## Review Focus

1. **옛 기록:** `updatedAt`, `skills`, 동기화 장부가 없고 `account` 필드가 남은 시험 기록이 목록·보고서·동기화에서 깨지지 않아야 한다 → Task 4, Task 7 테스트.
2. **평가 재시도와 모델 전환:** 같은 시험의 첨삭 묶음, 종합 판정, 재시도, 모델 전환이 `exam.evaluate`를 한 번만 세야 한다 → Task 6 테스트.
3. **한국 시간 자정 경계:** 23:59와 00:00(KST)이 서로 다른 날로 세어지고, UTC 기준 날짜와 섞이지 않아야 한다 → Task 6 테스트.
4. **두 기기 수정 충돌:** 오래된 사본을 보내면 서버가 거절하고, 브라우저는 서버 사본을 받아 덮어써야 한다. 데이터를 잃으면 안 된다 → Task 8, Task 9 테스트.
5. **녹음 저장소 없음:** Blob이 설정되지 않아 녹음 업로드가 503이면 기록은 저장되고, 녹음은 "안 올림"으로 남아 다음에 다시 시도해야 한다 → Task 9 테스트.

---

### Task 1: 테스트 기반과 모의고사 흐름 시험

현재 동작을 고정하는 안전망. 이후 모든 작업은 이 시험을 통과해야 한다.

**Files:**
- Modify: `package.json` (scripts `test`, `test:e2e`; devDependencies `vitest`, `fake-indexeddb`, `@playwright/test@1.56`)
- Create: `vitest.config.ts` (`@` → `src`, environment `node`, include `src/**/*.test.ts`)
- Create: `playwright.config.ts` (webServer `npm run dev -- -p 3100`, baseURL `http://localhost:3100`, chromium with `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`, `executablePath: process.env.CHROMIUM_PATH || undefined`)
- Create: `e2e/fixtures.ts`, `e2e/exam-flow.spec.ts`

**Interfaces:**
- Produces: `e2e/fixtures.ts`의 `mockTranscribe(page, opts?: { fallbackAt?: number })`, `mockFeedback(page)`, `blockFonts(page)`. 이후 Task가 API 경로를 바꿀 때 이 파일만 고친다.

- [ ] **Step 1:** 의존성 추가 후 `npx vitest run`이 "no test files"로 끝나는지 확인한다.
- [ ] **Step 2:** `mockFeedback`은 지금 경로(`/api/evaluate/questions`, `/api/evaluate/overall`)를 가로채, 현재 `QuestionBatchSchema`와 `OverallSchema`를 통과하는 고정 응답을 돌려준다(문항 번호는 요청의 `context.items`에서 가져온다). `mockTranscribe`는 문항 순서대로 군말이 섞인 고정 답변과 단어 시간을 돌려주고, `fallbackAt` 번째 호출에는 `fallback: "credits"`를 붙인다.
- [ ] **Step 3:** 시험 `exam completes and shows the report`: 홈 → "모의고사" → 시작 → 동의 두 개 → 서베이 4쪽 → 자가평가 4단계 → 마이크 연결·녹음 테스트 → 샘플 건너뛰기 → 문항 15개(7번 뒤 "비슷한 질문") → 실제 등급 "IM2" 선택 → "평가가 끝났습니다" → 보고서. 단언: `#grade` 섹션이 보이고, 문항 번호 버튼이 15개이며, 보고서 아래에 "로 평가"가 보인다.
- [ ] **Step 4:** 시험 `replay is offered for five seconds only once`: 첫 문항에서 질문 재생이 끝나면 "다시 듣기"가 보이고, 6초 뒤에는 사라진다. 한 번 누르면 다시 나타나지 않는다.
- [ ] **Step 5:** 시험 `fallback notice waits until the test ends`: `fallbackAt: 3`. 3~15번 문항 화면에서는 "보조 음성인식" 안내가 없고, 마지막 문항 뒤 화면에서 안내가 한 번 뜬다.
- [ ] **Step 6:** `npm run test:e2e`가 세 시험 모두 PASS하는지 확인한다.
- [ ] **Step 7:** 커밋 `test: add vitest and playwright harness with exam flow e2e`.

### Task 2: 오류 모양과 요청 도우미

**Files:**
- Create: `src/lib/http.ts`, `src/lib/http.test.ts`, `src/lib/server/api-error.ts`
- Modify: `src/lib/server/auth.ts` (`handle()`가 `apiError` 사용), `src/lib/server/store.ts` (`withStore`), `src/app/api/transcribe/route.ts`

**Interfaces:**
- Produces:
  - `type ApiErrorKind = "rate" | "daily" | "quota" | "auth" | "invalid" | "conflict"`
  - `class ApiError extends Error { status: number; kind?: ApiErrorKind; retryAfter?: number; remaining?: number; resetAt?: string; body: unknown }`
  - `request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T>` — 2xx는 JSON(또는 204 → undefined), 그 밖에는 `ApiError`를 던진다.
  - `apiError(status: number, error: string, extra?: Partial<Pick<ApiError, "kind" | "retryAfter" | "remaining" | "resetAt">> & { body?: Record<string, unknown> }): Response`

- [ ] **Step 1:** 시험 `request parses error shape`: fetch를 가짜로 바꿔 429 `{error:"x", kind:"quota", remaining:0}` → `ApiError`의 `status 429`, `kind "quota"`, `remaining 0`. 본문이 JSON이 아닌 500 → `error`는 `"요청에 실패했습니다 (500)"`.
- [ ] **Step 2:** 실패 확인 → 구현 → 통과 확인.
- [ ] **Step 3:** `handle()`의 `AuthError` 응답을 `apiError(status, message, { kind: status === 401 ? "auth" : "invalid" })`로 바꾼다. 응답 본문의 기존 `error` 문구는 그대로다.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e` 통과. 커밋 `refactor: one error shape for APIs and a shared request helper`.

### Task 3: 이름표 목록과 피드백 스키마

**Files:**
- Create: `src/lib/domain/skills.ts`, `src/lib/domain/skills.test.ts`, `src/lib/feedback/schema.ts`, `src/lib/feedback/schema.test.ts`
- Delete: `src/lib/evaluation/schema.ts` (모든 import를 `@/lib/feedback/schema`로)

**Interfaces:**
- Produces:
  - `SKILL_IDS` (스펙 3.1 순서의 `as const` 튜플), `type SkillId`, `type Skill = { id: SkillId; group: SkillGroup; label: string; definition: string }`, `SKILLS: readonly Skill[]`, `skillById(id: string): Skill | undefined`, `SKILL_GROUP_LABEL: Record<SkillGroup, string>`
  - `SkillMarkSchema = z.object({ skill: z.enum(SKILL_IDS), verdict: z.enum(["strong", "weak"]) })`
  - `AnswerFeedbackSchema` = 지금 `QuestionFeedbackSchema` + `skills: z.array(SkillMarkSchema)`, 그리고 `corrections[].skill`, `upgrades[].skill`(`z.enum(SKILL_IDS).optional()`)
  - `AnswerBatchSchema = z.object({ items: z.array(AnswerFeedbackSchema) })`, `OverallSchema`(지금 것 + `patterns[].skill` optional)
  - `type AnswerFeedback`, `type OverallFeedback`, 그리고 옛 이름 `QuestionFeedback = AnswerFeedback`(별칭)

- [ ] **Step 1:** 시험 `skills are unique and complete`: `SKILL_IDS.length === 21`, 중복 없음, 모든 id가 `group.name` 형식, `definition`이 비어 있지 않음.
- [ ] **Step 2:** 시험 `answer schema rejects unknown skills`: `skills: [{ skill: "made.up", verdict: "weak" }]` → 실패. `skills: []`와 교정 `skill` 생략 → 통과. `z.toJSONSchema(AnswerBatchSchema)`에 `enum`으로 21개가 들어 있음.
- [ ] **Step 3:** 구현(이름과 정의 문구는 스펙 3.1의 한국어 이름 + 영어 한 줄 정의). 실패 → 통과 확인.
- [ ] **Step 4:** `npm run typecheck`. 커밋 `feat: skill taxonomy and skill-tagged feedback schema`.

### Task 4: 시도·세션 모양과 모의고사 어댑터

**Files:**
- Create: `src/lib/domain/attempt.ts`, `src/lib/domain/session.ts`, `src/lib/domain/from-exam.ts`, `src/lib/domain/from-exam.test.ts`
- Modify: `src/lib/exam/result.ts` (`updatedAt?: number` 추가, `account?`에 "옛 기록 읽기 전용" 주석)

**Interfaces:**
- Consumes: `AnswerFeedback`, `SkillId` (Task 3)
- Produces: 스펙 3.2·3.3의 `Attempt`, `AttemptSource`, `Session`, `SessionKind`. `attemptsFromExam(result: ExamResult, evaluationId?: string): Attempt[]`. `normalizeFeedback(f: unknown): AnswerFeedback`(옛 평가에 `skills: []`를 채움).

- [ ] **Step 1:** 시험 `converts an exam into attempts`: 문항 3개, 답변 2개(하나는 받아쓰기 실패), 평가 1개(새 스키마). 결과: 시도 3개, id `${examId}:1…3`, `source "exam"`, 받아쓰기 없는 시도는 `transcript` 없음, `modelId`는 평가의 모델.
- [ ] **Step 2:** 시험 `legacy evaluation without skills` (Review Focus 1): 이름표 없는 옛 평가 → `feedback.skills`는 `[]`, 교정은 그대로. `evaluationId`로 두 번째 평가를 고를 수 있음. 평가가 없으면 `feedback` 없음.
- [ ] **Step 3:** 구현 → 통과 확인. 커밋 `feat: attempt and session model with exam adapter`.

### Task 5: 렌즈, 프롬프트, 피드백 API, 사다리

**Files:**
- Create: `src/lib/feedback/lenses.ts`, `src/lib/feedback/lenses.test.ts`, `src/lib/feedback/prompt.ts`, `src/lib/feedback/ladder.ts`, `src/lib/feedback/ladder.test.ts`, `src/lib/server/feedback-request.ts`, `src/app/api/feedback/answers/route.ts`, `src/app/api/feedback/overall/route.ts`
- Delete: `src/lib/evaluation/prompts.ts`, `src/lib/server/eval-request.ts`, `src/app/api/evaluate/**`
- Modify: `src/lib/client/evaluate.ts` (사다리 위에 얇게), `e2e/fixtures.ts` (새 경로)

**Interfaces:**
- Consumes: Task 3 스키마, `generate()`·`LlmError`(`src/lib/server/llm.ts`, 그대로), `SKILLS`
- Produces:
  - `type LensId = "exam" | \`type.${QuestionType}\` | "structure.opening" | "structure.reason" | "structure.example" | "structure.closing" | "structure.full"`
  - `type Lens = { id: LensId; focus: SkillId[]; instructions: string; weight: "full" | "light" }`, `LENSES: Record<LensId, Lens>`, `lensForType(t: QuestionType): LensId`
  - `answersSystemPrompt(lens: Lens): string`, `answersUserPrompt(ctx: EvalContext): string`, `overallSystemPrompt(): string`, `overallUserPrompt(ctx: EvalContext): string` (`EvalItem`, `EvalContext`는 여기로 옮김. `exam` 렌즈의 문구 = 지금 `questionSystemPrompt` + 이름표 지시)
  - 요청 본문: `{ model: string; lens: LensId; ref: string; context: EvalContext }`. `ref`는 사용량 참조(모의고사는 examId, 연습은 attemptId)
  - `POST /api/feedback/answers` → `{ items: AnswerFeedback[]; usage }`, `POST /api/feedback/overall` → `{ overall: OverallFeedback; usage }`. 오류는 `kind: rate | daily`(지금 사다리 신호 그대로), `quota`(Task 6)
  - 브라우저: `class OutForToday`, `class BusyNow`, `class QuotaReached` (`ApiError`를 감쌈), `postFeedback<T>(path, body, spill: () => boolean): Promise<T & { usage: Usage }>`, `runOnLadder<T>(available: string[], weight: "full" | "light", run: (modelId: string, mayHandOff: boolean) => Promise<T>): Promise<T>`

- [ ] **Step 1:** 시험 `every lens points at real skills`: 모든 렌즈의 `focus`가 `SKILL_IDS`에 있음, 렌즈 수 16, `type.past`의 focus에 `tense.past` 포함, `structure.*`는 `weight "light"`, `exam`은 `"full"`.
- [ ] **Step 2:** 시험 `ladder order and handoff`: 가짜 `run`이 3.8에 `OutForToday`, 3.7에 `BusyNow`, 3.6에 성공 → 3.6 결과, 호출 순서 [3.8, 3.7, 3.6]. 모두 `BusyNow` → 두 번째 바퀴에서 첫 바쁜 모델을 `mayHandOff=false`로 다시 부름. `weight "light"` → 첫 호출이 `gemini-3.5-flash-lite`. `QuotaReached` → 즉시 던지고 다음 모델로 넘어가지 않음.
- [ ] **Step 3:** 구현. 사다리 순서는 `MODELS`(`src/lib/models.ts`), light의 시작점은 `gemini-3.5-flash-lite`. `evaluate.ts`의 `post`/`pool`/`split`/분당 넘기기 규칙을 `ladder.ts`로 옮기고, `evaluate()`는 `runOnLadder(available, "full", …)` 위에서 첨삭 묶음(렌즈 `exam`)과 종합을 돌린다. 공개 함수 `evaluate(r, available, onProgress)` 시그니처는 그대로.
- [ ] **Step 4:** `mockFeedback`을 새 경로와 새 스키마(이름표 포함)로 바꾸고 `npm run test:e2e` 통과.
- [ ] **Step 5:** 수동 확인: `.env.local`의 실제 Gemini로 `curl -X POST /api/feedback/answers` (렌즈 `type.past`, `type.rp_ask`, `structure.opening` 각 1번) → 응답의 `items[0].skills`가 비어 있지 않고 스키마를 통과. 실패율이 눈에 띄면 스펙 위험 2대로 `skills`를 `.default([])`로 낮추고 기록한다.
- [ ] **Step 6:** 커밋 `feat: lens-based feedback API and shared model ladder`.

### Task 6: 사용량 장부

**Files:**
- Create: `src/lib/metering/actions.ts`, `src/lib/metering/day.ts`, `src/lib/metering/day.test.ts`, `src/lib/metering/decide.ts`, `src/lib/metering/decide.test.ts`, `src/lib/server/meter.ts`, `src/app/api/me/usage/route.ts`
- Modify: `src/app/api/feedback/*/route.ts`, `src/app/api/transcribe/route.ts`(헤더 `x-usage-ref`), `src/lib/client/transcribe.ts`(ref 전달), `src/app/api/cron/purge/route.ts`, `src/app/privacy/page.tsx`, `.env.example`(`USAGE_SALT`)

**Interfaces:**
- Produces:
  - `type ActionId = "exam.evaluate" | "feedback.answer" | "feedback.light" | "transcribe" | "story.generate"`, `ACTIONS: Record<ActionId, { label: string; freePerDay: { anon: number; member: number }; credits: number }>` (값은 Global Constraints, `credits`는 각각 10/1/0.3/0.2/5로 두고 아직 쓰지 않음)
  - `kstDay(at: Date): string` → `"YYYY-MM-DD"`, `nextKstMidnight(at: Date): Date`
  - `decide(usedToday: number, units: number, free: number, alreadyCounted: boolean): { ok: boolean; remaining: number }`
  - 서버 `meter(action: ActionId, units: number, ref: string): Promise<void>` (넘치면 `MeterError` → 라우트가 `apiError(429, …, { kind: "quota", remaining, resetAt })`), `usageSummary(): Promise<Record<ActionId, { used: number; free: number; remaining: number }>>`, `purgeUsage(): Promise<number>`
  - 표 `usage_events(subject text, action text, ref text, day date, units real, at timestamptz default now(), UNIQUE(subject, action, ref, day))`. subject는 `u:{userId}` 또는 `ip:{HMAC-SHA256(USAGE_SALT, ip)}`의 앞 32자.
  - 피드백 라우트의 행동: 렌즈 `exam` → `exam.evaluate`(units 1, ref = 요청 `ref`), weight `light` → `feedback.light`, 그 밖 → `feedback.answer`(units = items 수).

- [ ] **Step 1:** 시험 `kst day boundary` (Review Focus 3): `2026-10-14T14:59:59Z` → `"2026-10-14"`, `2026-10-14T15:00:00Z` → `"2026-10-15"`. `nextKstMidnight(2026-10-14T03:00Z)` → `2026-10-14T15:00:00.000Z`.
- [ ] **Step 2:** 시험 `same reference counts once` (Review Focus 2): `decide(2, 1, 2, true)` → `ok true, remaining 0`. `decide(2, 1, 2, false)` → `ok false`. `decide(0, 3, 10, false)` → `ok true, remaining 7`. `free 0`이면 언제나 `ok false`.
- [ ] **Step 3:** 구현. `meter()`는 같은 (subject, action, ref, day) 행이 있으면 통과, 없으면 오늘 합계로 `decide` 후 `INSERT … ON CONFLICT DO NOTHING`. DB가 없으면 바로 통과. 회원 판단은 `currentUser()`.
- [ ] **Step 4:** 모의고사 평가의 첨삭 묶음 2개 + 종합 1개가 모두 같은 `ref`(examId)를 보내는지 `evaluate.ts`에서 확인한다(요청 본문 `ref`).
- [ ] **Step 5:** 한도에 걸리면 `ladder.ts`가 `QuotaReached`를 던지고, 보고서의 평가 실패 자리에 "오늘 무료 모의고사 평가를 모두 썼습니다. 내일 0시에 다시 채워집니다."가 뜬다(문구는 `ACTIONS[action].label`로 조립).
- [ ] **Step 6:** cron이 `purgeUsage()`(90일)를 함께 부른다. 처리방침에 "사용량 확인을 위해 IP의 해시값을 90일 보관합니다."를 넣는다.
- [ ] **Step 7:** 수동 확인(로컬 Postgres + Task 8의 프록시): 같은 examId로 평가 두 번 → 한 줄만 쌓임. 비회원으로 두 번째 시험 평가 → 429 `quota`.
- [ ] **Step 8:** `npm test`, `npm run test:e2e`(가짜 응답이라 한도와 무관) 통과. 커밋 `feat: per-action daily usage ledger`.

### Task 7: 브라우저 문서 저장소

**Files:**
- Create: `src/lib/docs/kinds.ts`, `src/lib/docs/local.ts`, `src/lib/docs/local.test.ts`
- Modify: `src/lib/client/db.ts` (VERSION 2, 저장소 `docs`·`sync` 추가), `src/components/exam/ExamApp.tsx`(최종 저장), `src/components/report/ReportApp.tsx`(`save()`)

**Interfaces:**
- Produces:
  - `type DocKind = "exam" | "session" | "note" | "story"`, `type Doc<T = unknown> = { kind: DocKind; id: string; updatedAt: number; deletedAt?: number; data: T | null }`
  - `KINDS: Record<DocKind, { maxBytes: number; hasAudio: boolean; summary(data: unknown): Record<string, unknown> }>` (exam 요약 = `{ createdAt, startLevel, finalLevel, questionCount, grade, model }`, maxBytes exam·session 900_000, note 50_000, story 200_000). 서버도 이 파일을 쓴다(브라우저 전용 import 금지).
  - `type SyncState = { pushedVersion?: number; syncedAt?: number; uploaded: string[]; error?: string }`
  - `localDocs.get<T>(kind, id)`, `localDocs.put<T>(kind, id, data, opts?: { updatedAt?: number })` (기본 `Date.now()`), `localDocs.remove(kind, id)`(삭제 표시), `localDocs.list(kind, opts?: { withDeleted?: boolean }): Promise<Doc[]>`, `localDocs.getSync(kind, id)`, `localDocs.setSync(kind, id, s)`, `localDocs.clearSync(): Promise<void>`
  - exam은 `results` 저장소를 읽고 쓴다. `updatedAt`이 없으면 `createdAt`. 읽을 때 `data.account`가 있으면 `{ syncedAt: account.syncedAt, pushedVersion: createdAt, uploaded: account.uploaded.map(String), error }`로 `sync`에 옮기고 `results`에서 그 필드를 지운다. 삭제 표시는 `docs` 저장소의 `exam:{id}`에 남긴다.

- [ ] **Step 1:** 시험(fake-indexeddb) `exam docs read the results store`: v1 DB에 `results`만 있는 상태로 시작 → v2로 열림, 기존 기록이 `get("exam", id)`로 나오고 `updatedAt === createdAt`.
- [ ] **Step 2:** 시험 `legacy account bookkeeping moves to sync` (Review Focus 1): `account: { uploaded: [1,2], syncedAt: 5 }`가 있는 기록 → `getSync`가 `uploaded ["1","2"]`, `syncedAt 5`이고, 다시 읽은 `data`에 `account`가 없음.
- [ ] **Step 3:** 시험 `remove leaves a tombstone`: `remove("session", id)` → `get`은 `deletedAt`이 있고 `data null`, `list`에서는 빠지고 `withDeleted`에서는 나옴.
- [ ] **Step 4:** 구현 → 통과. ExamApp과 ReportApp의 `putResult` 호출을 `localDocs.put("exam", …)`로 바꾼다. `npm run test:e2e` 통과.
- [ ] **Step 5:** 커밋 `feat: local document store with kind registry`.

### Task 8: 서버 문서 저장소와 이사

**Files:**
- Create: `src/lib/server/docs.ts`, `src/lib/server/docs.test.ts`(순수 함수만), `src/app/api/me/docs/route.ts`, `src/app/api/me/docs/[kind]/[id]/route.ts`, `src/app/api/me/docs/[kind]/[id]/audio/[key]/route.ts`, `scripts/neon-http-proxy.mjs`
- Modify: `src/app/api/me/records-consent/route.ts`, `src/app/api/account/route.ts`, `README.md`(로컬 Postgres 확인법)
- Delete: `src/lib/server/user-exams.ts`, `src/app/api/me/exams/**`

**Interfaces:**
- Consumes: `KINDS`, `Doc` (Task 7), `apiError` (Task 2), `sql()`·`requireUser()`·`handle()` (`auth.ts`)
- Produces:
  - `isStale(incoming: number, stored: number | null): boolean` (stored가 있고 incoming < stored면 true)
  - `listDocs(user, kind): Promise<{ id: string; updatedAt: number; deletedAt?: number; summary: Record<string, unknown> }[]>`, `getDoc(user, kind, id): Promise<Doc | null>`, `putDoc(user, kind, id, body: { updatedAt: number; data: unknown }): Promise<{ ok: true } | { conflict: Doc }>`, `deleteDoc(user, kind, id): Promise<void>`, `putDocAudio(user, kind, id, key, body: Buffer, contentType: string)`, `readDocAudio(user, kind, id, key): Promise<Response>`, `removeAllDocs(userId: string)`, `setRecordsConsent(user, agree: boolean)`
  - 검증: kind ∈ `KINDS`, id `/^[A-Za-z0-9_-]{6,64}$/`, key `/^[a-z0-9_-]{1,40}$/`, 크기 ≤ `KINDS[kind].maxBytes`, 녹음 ≤ 4_400_000바이트, `hasAudio` 아닌 종류는 녹음 거절.
  - 충돌 응답: `409 { error: "더 최근에 고친 기록이 있습니다.", kind: "conflict", doc }`.
  - 표 초기화에서 `to_regclass('user_exams')`가 있으면 `INSERT INTO user_docs (user_id, kind, id, updated_at, summary, data, audio) SELECT user_id, 'exam', id, updated_at, jsonb_build_object(…), data, audio FROM user_exams ON CONFLICT DO NOTHING`.
  - `scripts/neon-http-proxy.mjs`: 이번 세션에서 쓴 Neon HTTP 흉내 프록시(포트 인자, `pg` 사용). README에 `NEON_FETCH_ENDPOINT` 사용법.

- [ ] **Step 1:** 시험 `stale writes are rejected` (Review Focus 4): `isStale(5, 10)` true, `isStale(10, 10)` false, `isStale(5, null)` false.
- [ ] **Step 2:** 구현. 계정 저장 동의(`recordsConsent`)가 없으면 PUT·녹음 PUT은 403 `kind "auth"`. 삭제는 `deleted_at = now()`, `data = NULL`, `audio = '{}'`로 바꾸고 녹음 파일을 지운다.
- [ ] **Step 3:** 수동 확인(로컬 Postgres + 프록시): 이번 세션처럼 `user_exams`에 기록 1건 → 서버 첫 요청 뒤 `user_docs`에 같은 기록이 있음. 두 번 재시작해도 1건. 오래된 `updatedAt`으로 PUT → 409와 서버 사본. DELETE → 목록에 `deletedAt`이 있음.
- [ ] **Step 4:** `npm test`, `npm run typecheck` 통과. 커밋 `feat: generic account documents with user_exams migration`.

### Task 9: 동기화 엔진과 화면 연결

**Files:**
- Create: `src/lib/docs/policy.ts`, `src/lib/docs/account.ts`, `src/lib/docs/sync.ts`, `src/lib/docs/sync.test.ts`
- Modify: `src/components/home/Home.tsx`, `src/components/report/ReportApp.tsx`, `src/components/report/QuestionDetail.tsx`, `src/lib/client/research.ts`, `src/components/account/AccountPage.tsx`
- Delete: `src/lib/client/account-records.ts`

**Interfaces:**
- Consumes: `localDocs`, `KINDS` (Task 7), 서버 API (Task 8), `request`·`ApiError` (Task 2)
- Produces:
  - `STORAGE_POLICY: "local-first" | "account-first"` (= `"local-first"`), `syncEnabled(user: { recordsConsent: boolean } | null): boolean`
  - `accountDocs.list(kind)`, `.get(kind, id)`, `.put(kind, id, doc)`, `.remove(kind, id)`, `.putAudio(kind, id, key, blob)`, `.getAudio(kind, id, key)`
  - `planSync(local: Doc[], remote: { id: string; updatedAt: number; deletedAt?: number }[], sync: Record<string, SyncState | undefined>): { push: string[]; dropLocal: string[] }`
  - `pushDoc(kind, id): Promise<SyncState>` — 보내고 녹음 올리기. 녹음 503이면 멈추고 그 녹음은 `uploaded`에 넣지 않음. 409면 서버 사본으로 로컬을 덮어씀(`updatedAt` 유지).
  - `syncKind(kind): Promise<{ remote: …listDocs 결과 }>`, `scheduleSync(kind, id)`(1초 몰아서), `loadDoc<T>(kind, id): Promise<Doc<T> | null>`(로컬 → 계정 → 로컬 사본), `loadRecording(audioKey: string): Promise<Blob | undefined>`(exam의 `${examId}:${n}` → kind exam, key n)

- [ ] **Step 1:** 시험 `plan pushes newer local docs and drops remote deletions`: 로컬 a(updatedAt 5, pushedVersion 5) → push 안 함, b(7, pushedVersion 3) → push, c는 원격 `deletedAt` 있음 → dropLocal. 로컬에만 있는 d → push.
- [ ] **Step 2:** 시험 `audio 503 keeps the record and retries later` (Review Focus 5): 가짜 fetch가 문서 PUT 200, 녹음 PUT 503 → 결과 `uploaded []`, `error` 없음, `pushedVersion` 설정됨. 다음 `pushDoc`이 녹음을 다시 시도함.
- [ ] **Step 3:** 시험 `conflict adopts the server copy` (Review Focus 4): 문서 PUT이 409 + `doc` → `localDocs.get`이 서버 데이터와 `updatedAt`을 가짐.
- [ ] **Step 4:** 구현 후 화면을 옮긴다. Home: `syncKind("exam")`의 원격 요약을 목록에 합치고(지금 `fromAccount`와 같은 행 모양), 홈 진입 때 `planSync`의 push를 차례로 보냄(지금 "계정에 저장하는 중 · n개 남음" 유지). ReportApp: `loadDoc("exam", id)`로 열고, `save()` 뒤 `scheduleSync`. QuestionDetail·research·재받아쓰기: `loadRecording`. AccountPage: 저장 끄기 뒤 `localDocs.clearSync()`.
- [ ] **Step 5:** `npm test`, `npm run test:e2e` 통과. 수동 확인(로컬 Postgres + 프록시, 브라우저 두 개): 이번 세션의 두 기기 시험(A에서 시험 → 가입 → 동의 → B에서 로그인 → 목록·보고서 열림 → 저장 끄기 → 0건)을 다시 통과.
- [ ] **Step 6:** 커밋 `feat: sync engine over the document stores`.

### Task 10: 답변 받기 엔진

**Files:**
- Create: `src/lib/capture/policy.ts`, `src/lib/capture/policy.test.ts`, `src/lib/capture/useMicrophone.ts`, `src/lib/capture/useAnswerCapture.ts`, `src/lib/capture/pipeline.ts`
- Modify: `src/components/exam/QuestionStage.tsx`, `src/components/exam/ExamApp.tsx`, `src/components/exam/Setup.tsx`, `README.md`(출제 규칙이 `EXAM_POLICY`를 가리키게)

**Interfaces:**
- Consumes: `Recorder`·`speak`·`useMicLevel`·`requestMic` (`src/lib/client/audio.ts`), `transcribeBlob`, `localDocs`/`putAudio`
- Produces:
  - `type CapturePolicy = { replay: { limit: number; windowMs: number | null }; showText: boolean; allowRetry: boolean }`, `EXAM_POLICY = { replay: { limit: 1, windowMs: 5000 }, showText: false, allowRetry: false }`, `PRACTICE_POLICY = { replay: { limit: Infinity, windowMs: null }, showText: true, allowRetry: true }`
  - `replayState(policy: CapturePolicy, s: { replays: number; answeringSince: number; now: number }): { allowed: boolean; secondsLeft: number | null }`
  - `useMicrophone(): { stream: MediaStream | null; status: "idle" | "asking" | "ready" | "denied" | "error"; request(): Promise<MediaStream | null>; release(): void }`
  - `useAnswerCapture(o: { text: string; voice?: SpeechSynthesisVoice; stream: MediaStream; policy: CapturePolicy; deadline?: number; onRecorded(rec: Recording, meta: { replays: number }): void })` → `{ phase: "ready" | "playing" | "answering" | "saving"; level: number; elapsedMs: number; replay: { allowed: boolean; secondsLeft: number | null }; play(): void; replayNow(): void; submit(): void; retry(): void }`
  - `keepAndTranscribe(rec: Recording, audioKey: string, opts?: { usageRef?: string }): Promise<{ transcript: Transcript; fallback?: FallbackReason }>`

- [ ] **Step 1:** 시험 `exam replay rule`: `replayState(EXAM_POLICY, { replays: 0, answeringSince: 0, now: 4000 })` → `allowed true, secondsLeft 1`. `now 5001` → `allowed false`. `replays 1` → `allowed false`. PRACTICE → 언제나 `allowed true, secondsLeft null`.
- [ ] **Step 2:** 구현. `QuestionStage`는 `{ capture: ReturnType<typeof useAnswerCapture>; policy: CapturePolicy; text: string }`를 받아 그리기만 한다. 화면 모양과 문구는 그대로이고, `policy.showText`·`allowRetry`일 때만 "질문 보기"·"다시 말하기"가 나온다. ExamApp의 `runTranscription`은 `keepAndTranscribe`(usageRef = audioKey)를 부른다. 40분 마감은 ExamApp에 남는다.
- [ ] **Step 3:** `npm test`, `npm run test:e2e`(Task 1의 다시 듣기 5초·보조 음성인식 시험 포함) 통과.
- [ ] **Step 4:** 커밋 `refactor: answer capture engine with exam and practice policies`.

### Task 11: 기능 등록부와 공통 머리말

**Files:**
- Create: `src/lib/features.ts`, `src/components/AppShell.tsx`, `e2e/shell.spec.ts`
- Modify: `src/components/home/Home.tsx`(메뉴가 등록부를 읽음), `src/components/report/ReportApp.tsx`(`Shell` 대신 `AppShell`), `src/components/account/parts.tsx`(`AuthShell`이 `AppShell` 사용), `src/app/privacy/page.tsx`

**Interfaces:**
- Produces:
  - `type Feature = { id: "mock" | "notes" | "practice" | "structure" | "stories"; label: string; href: string; status: "open" | "soon"; description: string; children?: { id: string; label: string; description: string }[] }`, `FEATURES: Feature[]`(스펙 8절의 순서·문구 = 지금 홈 메뉴 문구), `openFeatures(): Feature[]`
  - `AppShell({ children, width }: { children: ReactNode; width?: "narrow" | "default" | "wide" })`: 왼쪽 워드마크, 가운데 `openFeatures()` 링크(현재 경로는 `text-ink font-semibold`), 오른쪽 로그인/닉네임. 640px 미만에서는 링크가 아래 줄, 가로 스크롤.

- [ ] **Step 1:** 시험 `home menu comes from the feature list`: 홈에 다섯 항목이 등록부 순서대로 보이고, "모의고사"만 링크이며 나머지는 `aria-disabled`. 머리말에 "모의고사" 링크가 있고 "첨삭노트" 링크는 없음. 보고서·로그인·처리방침에도 같은 머리말이 있음.
- [ ] **Step 2:** 구현 → `npm run test:e2e` 통과. 휴대폰 폭(390px) 스크린샷으로 머리말이 넘치지 않는지 확인.
- [ ] **Step 3:** 커밋 `feat: feature registry and shared app shell`.

### Task 12: 마무리 확인과 문서

**Files:**
- Modify: `README.md`(구조, 시험 실행법, 사용량 한도, `user_docs`, 로컬 DB 확인법), `.env.example`

- [ ] **Step 1:** `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`가 모두 통과.
- [ ] **Step 2:** 실제 Gemini로 모의고사를 끝까지 한 번(받아쓰기는 가짜, 평가는 실제) → 보고서가 보이고 저장된 평가의 문항마다 `skills`가 있음. 옛 기록(이름표 없음)도 열림.
- [ ] **Step 3:** 로컬 Postgres + 프록시로 사용량 한도(비회원 두 번째 평가 429)와 두 기기 동기화를 다시 확인.
- [ ] **Step 4:** 커밋 `docs: foundation overview, tests and local database guide` 후 푸시.
