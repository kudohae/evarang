/*
  AI services a member can bring their own key for. Shared by the browser (sign-up, account) and the server.
  A provider opens by switching `enabled` once its adapter exists in lib/server/llm.ts.
*/

export type AiProviderId = "gemini" | "openai" | "anthropic" | "groq";

export type AiProvider = { id: AiProviderId; label: string; enabled: boolean; keyUrl?: string; keyUrlLabel?: string; placeholder?: string };

export const AI_PROVIDERS: AiProvider[] = [
  { id: "gemini", label: "Google Gemini", enabled: true, keyUrl: "https://aistudio.google.com/apikey", keyUrlLabel: "Google AI Studio에서 무료로 발급", placeholder: "AIza로 시작하는 키" },
  { id: "openai", label: "OpenAI (ChatGPT)", enabled: false },
  { id: "anthropic", label: "Anthropic (Claude)", enabled: false },
  { id: "groq", label: "Groq", enabled: false },
];

export function aiProvider(id: string): AiProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id);
}

/** Shown wherever a key is asked for, so a member knows what leaving it empty means. */
export const KEY_NOTICE =
  "키를 넣지 않으면 사이트의 무료 AI를 하루 정해진 횟수만큼 씁니다(회원: 모의고사 평가 하루 2번, 답변 피드백 30번). 키를 넣으면 평가와 피드백을 내 키로 받고 이 한도가 없습니다. 받아쓰기는 사이트가 맡습니다.";
