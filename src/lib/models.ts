export type Provider = "gemini" | "groq";

export type ModelOption = {
  id: string;
  provider: Provider;
  label: string;
  /** Runs on the signed-in member's own API key instead of the site's free quota. */
  own?: boolean;
};

/**
 * Free-tier models, best first. Grading starts at the top and moves down only when a model's daily
 * free quota is spent; every Gemini model has its own quota, so each step buys a few more tests.
 */
export const MODELS: ModelOption[] = [
  { id: "gemini-3.8-flash", provider: "gemini", label: "Gemini 3.8 Flash" },
  { id: "gemini-3.7-flash", provider: "gemini", label: "Gemini 3.7 Flash" },
  { id: "gemini-3.6-flash", provider: "gemini", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash", provider: "gemini", label: "Gemini 3.5 Flash" },
  { id: "gemini-3.5-flash-lite", provider: "gemini", label: "Gemini 3.5 Flash-Lite" },
  { id: "groq-gpt-oss", provider: "groq", label: "GPT-OSS 120B · Groq" },
];

const OWN = "own:";

/** The same Gemini models on a member's own key: tried before the shared ones, and not counted against free limits. */
export const OWN_MODELS: ModelOption[] = MODELS.filter((m) => m.provider === "gemini").map((m) => ({ ...m, id: `${OWN}${m.id}`, label: `${m.label} · 내 키`, own: true }));

export function isOwnModel(id: string): boolean {
  return id.startsWith(OWN);
}

/** The provider's model name behind an own-key id. */
export function baseModelId(id: string): string {
  return isOwnModel(id) ? id.slice(OWN.length) : id;
}

/** Models earlier versions graded with; kept so old reports still show a readable name. */
const RETIRED: Record<string, string> = {
  "groq-llama": "Llama 3.3 70B · Groq",
  "xai-grok": "Grok · xAI",
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
  "claude-opus-5-5": "Claude Opus 5.5",
};

export function modelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id) ?? OWN_MODELS.find((m) => m.id === id);
}

export function modelLabel(id: string): string {
  return modelById(id)?.label ?? RETIRED[id] ?? id;
}

export type Usage = { inputTokens: number; outputTokens: number };
