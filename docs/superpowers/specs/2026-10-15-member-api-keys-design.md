# 회원 API 키 (내 키로 평가받기)

## 1. 목표

회원이 가입할 때나 내 정보에서 AI 종류와 API 키를 넣으면, 그 회원의 평가와 피드백은 회원의 키로 돌고 사이트의 하루 무료 한도를 받지 않는다. 키는 선택이다. 키가 없는 회원과 비회원은 지금처럼 서버의 무료 모델을 하루 정해진 횟수 안에서 쓴다. 가입 화면과 내 정보 화면에 이 차이를 적는다.

사용자가 정한 것:
- 키는 선택. 넣지 않으면 한도가 있다는 점을 화면에 명시한다.
- 드롭다운에는 Google Gemini, OpenAI (ChatGPT), Anthropic (Claude), Groq 네 가지를 넣는다. 지금은 Gemini만 고를 수 있고 나머지 셋은 "준비 중"으로 비활성화한다.
- 키는 서버에 암호화해서 보관한다.
- 나머지 결정은 구현자에게 맡겼다(아래 "판단").

## 2. 데이터

- 등록부 `src/lib/ai-providers.ts`(브라우저·서버 공용): `{ id: "gemini" | "openai" | "anthropic" | "groq", label, enabled, keyUrl?, placeholder? }`. 지금은 gemini만 `enabled`.
- 표 `user_ai_keys(user_id PK → users ON DELETE CASCADE, provider, key_enc, hint, updated_at)`. 회원당 키 하나.
- 암호화: AES-256-GCM. 비밀값은 환경 변수 `AI_KEY_SECRET`(긴 임의 문자열). 그 SHA-256을 키로 쓴다. 저장 형식은 `v1.<iv>.<tag>.<ciphertext>`(base64url)이다. `hint`는 키 끝 4자리다.
- `AI_KEY_SECRET`이나 DB가 없으면 이 기능은 꺼진다(`config.aiKeys = false`). 그때는 가입·내 정보에 입력란이 보이지 않는다.
- 키 원문은 브라우저로 다시 내려가지 않는다. 화면에는 `Google Gemini · ••••abcd`만 보인다. 로그에도 남기지 않는다.

## 3. 저장과 확인

- 저장 전에 공급자에게 키가 유효한지 묻는다. Gemini는 `GET /v1beta/models?pageSize=1`이고, 헤더 `x-goog-api-key`로 보낸다.
  - 400·401·403이면 "API 키가 올바르지 않습니다."
  - 네트워크 오류면 "키를 확인하지 못했습니다. 잠시 후 다시 시도하세요."
  - 둘 다 저장하지 않는다.
- 가입: 본문에 `aiProvider`, `aiKey`(선택)를 받는다. 키가 있으면 계정을 만들기 전에 확인하고, 실패하면 가입도 하지 않는다.
- API는 `GET|PUT|DELETE /api/account/ai-key`이다.
  - PUT의 본문은 `{ provider, key }`이다.
  - 같은 출처 검사(`handle`)와 로그인이 필요하다.
  - 키 확인 시도는 회원당 15분에 10번으로 제한한다(`limit`).
- `/api/config`의 `user.aiKey`는 `{ provider, hint } | null`이다.
- 탈퇴하면 표가 함께 지워진다(CASCADE). 처리방침에 항목을 더한다.

## 4. 평가 경로

- 회원 키 모델은 별도 id로 둔다: `own:gemini-3.8-flash` 등.
  - `modelLabel`은 "Gemini 3.8 Flash · 내 키"로 보여준다.
  - 보고서와 관리자 화면은 이 id를 그대로 기록하므로, 서버 키 평가와 섞이지 않는다.
- 사다리 순서: 내 키 모델(Gemini 순서 그대로) → 서버 무료 모델.
  - 렌즈 무게가 `light`이면 두 묶음 모두 Flash-Lite부터 탄다.
  - 내 키가 하루 한도에 걸리거나 거부되면 서버 무료 모델로 내려간다. 거기서부터는 무료 한도가 적용된다.
- `/api/config`의 `models`에는 내 키 모델도 들어간다. 로그인했고 Gemini 키가 있으며, 그 회원의 그 모델이 오늘 한도에 걸리지 않았으면 쓸 수 있다.
- 서버(`feedback-request.ts`): 모델이 `own:`이면 회원의 키를 꺼내 호출하고 `meter()`를 부르지 않는다.
  - 로그인이 안 되었거나 키가 없으면 `kind: "daily"`로 거절해, 사다리가 다음 모델로 넘어가게 한다.
- `llm.ts`: `generate`가 `apiKey`, `owner`를 받는다.
  - 하루 한도 기억(`outUntil`)은 `owner:model`로 나눠서, 한 회원의 키가 다른 회원이나 서버 키에 영향을 주지 않게 한다.
  - Gemini가 키를 거부하면(400 API_KEY_INVALID, 401, 403) 그 회원의 그 모델을 오늘 쓰지 않는 것으로 보고 `daily`를 돌려준다. 문구는 "내 API 키가 거부되었습니다. 내 정보에서 키를 확인하세요."이다.
- 받아쓰기는 지금처럼 서버가 맡는다(AssemblyAI, 보조 Gemini는 서버 키). 회원 하루 120번 한도도 그대로다. 모의고사 8번쯤에 해당한다.

## 5. 화면

- 가입: 비밀번호 확인 아래에 "AI API 키 (선택)" 묶음을 둔다.
  - 드롭다운: Google Gemini / OpenAI (ChatGPT) · 준비 중 / Anthropic (Claude) · 준비 중 / Groq · 준비 중.
  - 비밀번호형 입력란 하나와 "Google AI Studio에서 무료로 발급" 링크.
  - 안내 문구: "키를 넣지 않으면 사이트의 무료 AI를 하루 정해진 횟수만큼 씁니다(회원: 모의고사 평가 하루 2번, 답변 피드백 30번). 키를 넣으면 평가와 피드백을 내 키로 받고 이 한도가 없습니다. 받아쓰기는 사이트가 맡습니다."
- 내 정보: "AI API 키" 구역.
  - 키가 있으면 지금 키를 보여주고 "바꾸기"와 "지우기"를 둔다. 없으면 입력 폼과 같은 안내를 둔다.
- 모양은 지금 `Field`, `Section`, `Button`을 그대로 쓴다. 드롭다운은 `Field`와 같은 모양의 `select`이다.

## 6. 시험

- 단위 테스트:
  - 암호화: 왕복 동작, 매번 다른 iv, 다른 비밀값이나 변조된 값은 실패.
  - `hint`, 키 확인(가짜 fetch: 200 / 400 / 네트워크 오류).
  - 사다리 순서(내 키 모델 먼저, light는 각 묶음의 Flash-Lite부터).
  - `modelLabel`, `modelById`(own id).
  - Gemini 키 거부 분류.
- 수동 확인(로컬 Postgres + 프록시):
  - 가짜 키로 가입하면 거절된다.
  - 내 키 모델 요청은 사용 기록을 남기지 않는다.
  - 키를 지우면 config의 `aiKey`가 null이 된다.

## 7. 판단 (구현자가 정함)

- 내 키가 실패하면 서버 무료 모델로 내려간다. 평가가 아예 안 되는 것보다 낫고, 내려간 뒤에는 무료 한도가 적용되므로 비용 면에서 안전하다.
- 받아쓰기는 회원 키로 옮기지 않는다. AssemblyAI의 단어 시간 정보가 군말·멈춤 표시에 필요하다. 회원 한도 120번은 모의고사 8번쯤이라 충분하다.
- 회원당 키는 하나다. 드롭다운이 하나라는 요청과 맞고, 여러 키는 필요해질 때 표에 공급자 열을 키로 넣으면 된다.
- OpenAI·Claude·Groq는 등록부에서 `enabled: false`로만 둔다. 어댑터는 열 때 만든다.
