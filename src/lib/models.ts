export type Provider = "anthropic" | "gemini" | "groq" | "xai";

export type ModelOption = {
  id: string;
  provider: Provider;
  label: string;
  tier: "무료" | "저가" | "표준" | "고급" | "유료";
  /** USD per million tokens; null when the price is unknown or zero on the free tier. */
  price: { input: number; output: number } | null;
  note: string;
};

export const MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash-lite",
    provider: "gemini",
    label: "Gemini 3.5 Flash-Lite",
    tier: "무료",
    price: null,
    note: "무료 등급 한도가 넉넉한 편입니다. 첨삭이 단순해질 수 있습니다.",
  },
  {
    id: "gemini-3.8-flash",
    provider: "gemini",
    label: "Gemini 3.8 Flash",
    tier: "무료",
    price: null,
    note: "무료 등급에서는 하루 요청 수가 적습니다.",
  },
  {
    id: "groq-llama",
    provider: "groq",
    label: "Llama 3.3 70B · Groq",
    tier: "무료",
    price: null,
    note: "분당 토큰 한도 때문에 평가가 느릴 수 있습니다.",
  },
  {
    id: "xai-grok",
    provider: "xai",
    label: "Grok · xAI",
    tier: "유료",
    price: null,
    note: "xAI 계정의 크레딧이 차감됩니다.",
  },
  {
    id: "claude-haiku-5-5",
    provider: "anthropic",
    label: "Claude Haiku 5.5",
    tier: "저가",
    price: { input: 0.1, output: 0.5 },
    note: "시험 1회 몇 센트 수준입니다.",
  },
  {
    id: "claude-sonnet-5-5",
    provider: "anthropic",
    label: "Claude Sonnet 5.5",
    tier: "표준",
    price: { input: 2, output: 10 },
    note: "품질과 비용의 균형점입니다.",
  },
  {
    id: "claude-opus-5-5",
    provider: "anthropic",
    label: "Claude Opus 5.5",
    tier: "고급",
    price: { input: 4, output: 20 },
    note: "등급 판정이 가장 정밀합니다.",
  },
];

export function modelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}

/** AssemblyAI Universal-3.5 Pro, pre-recorded. Public list price at time of writing. */
export const STT_USD_PER_HOUR = 0.21;

export type Usage = { inputTokens: number; outputTokens: number };

export function estimateCost(model: ModelOption, usage: Usage): number | null {
  if (!model.price) return null;
  return (usage.inputTokens * model.price.input + usage.outputTokens * model.price.output) / 1_000_000;
}
