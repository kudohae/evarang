import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ModelOption, Provider, Usage } from "@/lib/models";

/**
 * kind "rate": a per-minute limit or a busy server; the same model works again after `retryAfter` seconds.
 * kind "daily": the model is out for the day (daily free quota spent, or not offered on this key); grading moves down the list.
 */
export type LimitKind = "rate" | "daily";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly kind?: LimitKind,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

type Request<T> = {
  model: ModelOption;
  system: string;
  user: string;
  schema: z.ZodType<T>;
};

export type LlmResult<T> = { data: T; usage: Usage };

const ENV_KEY: Record<Provider, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
};

export function providerConfigured(p: Provider): boolean {
  return Boolean(process.env[ENV_KEY[p]]);
}

// A warm server instance remembers which models are out for the day, so later requests skip them without a round trip.
const outUntil = new Map<string, number>();

export function modelAvailable(m: ModelOption): boolean {
  return providerConfigured(m.provider) && (outUntil.get(m.id) ?? 0) < Date.now();
}

function dailyLimit(model: ModelOption, retrySeconds: number | undefined): LlmError {
  outUntil.set(model.id, Date.now() + Math.min(retrySeconds ?? 3600, 86_400) * 1000);
  return new LlmError(`${model.label}의 오늘 무료 한도를 다 썼습니다.`, 429, "daily", retrySeconds);
}

export async function generate<T>(req: Request<T>): Promise<LlmResult<T>> {
  if (!providerConfigured(req.model.provider)) {
    throw new LlmError(`${req.model.label}의 API 키가 서버에 설정되지 않았습니다.`, 400, "daily");
  }
  if (!modelAvailable(req.model)) throw new LlmError(`${req.model.label}의 오늘 무료 한도를 다 썼습니다.`, 429, "daily");
  switch (req.model.provider) {
    case "gemini":
      return withRetry(() => gemini(req));
    case "groq":
      return withRetry(() => openaiCompatible(req, "https://api.groq.com/openai/v1", process.env.GROQ_API_KEY!, groqModel()));
  }
}

/** Free providers occasionally return JSON that fails validation; one retry fixes most of it. Limits are left to the caller. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LlmError && (e.kind || e.status < 500)) throw e;
    return fn();
  }
}

/** "13h10m23.3s" or "37s" → seconds. */
function parseDuration(text: string): number | undefined {
  const m = /(?:(\d+)h)?(?:(\d+)m(?!s))?(?:([\d.]+)s)?/.exec(text);
  if (!m || !m[0]) return undefined;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Math.ceil(Number(m[3] ?? 0));
}

// ── Gemini ─────────────────────────────────────────────────

let geminiClient: GoogleGenAI | null = null;

async function gemini<T>(req: Request<T>): Promise<LlmResult<T>> {
  geminiClient ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let res;
  try {
    res = await geminiClient.models.generateContent({
      model: req.model.id,
      contents: req.user,
      config: {
        systemInstruction: req.system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(req.schema),
      },
    });
  } catch (e) {
    throw geminiError(req.model, e);
  }
  const data = parseJson(res.text ?? "", req.schema);
  const u = res.usageMetadata;
  return {
    data,
    usage: {
      inputTokens: u?.promptTokenCount ?? 0,
      outputTokens: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0),
    },
  };
}

function geminiError(model: ModelOption, e: unknown): LlmError {
  const msg = e instanceof Error ? e.message : String(e);
  const status = (e as { status?: number }).status;
  if (status === 429 || /RESOURCE_EXHAUSTED/.test(msg)) {
    const after = parseDuration(/retry in ([\dhms.]+)/i.exec(msg)?.[1] ?? /"retryDelay":\s*"([\d.]+s)"/.exec(msg)?.[1] ?? "");
    // A per-day quota, a zero allowance, or a wait longer than a couple of minutes all mean this model is done for today.
    if (/PerDay/i.test(msg) || /limit: 0\b/.test(msg) || (after ?? 0) > 120) return dailyLimit(model, after);
    return new LlmError(`${model.label}의 분당 한도에 걸렸습니다.`, 429, "rate", after ?? 20);
  }
  if (status === 503 || /UNAVAILABLE|overloaded/i.test(msg)) return new LlmError(`${model.label} 서버가 바쁩니다.`, 503, "rate", 8);
  if (status === 404 || /NOT_FOUND/.test(msg)) return dailyLimit(model, 86_400);
  return new LlmError(`Gemini 오류: ${msg.slice(0, 300)}`);
}

// ── OpenAI-compatible (Groq) ──────────────────────────────

function groqModel(): string {
  return process.env.GROQ_MODEL || "openai/gpt-oss-120b";
}

async function openaiCompatible<T>(req: Request<T>, base: string, key: string, model: string): Promise<LlmResult<T>> {
  const schema = JSON.stringify(z.toJSONSchema(req.schema));
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${req.system}\n\nRespond with a single JSON object that matches this JSON Schema exactly:\n${schema}` },
        { role: "user", content: req.user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (res.status === 429 || res.status === 413 || res.status === 503) {
    const text = await res.text();
    const after = Number(res.headers.get("retry-after")) || parseDuration(/try again in ([\dhms.]+)/i.exec(text)?.[1] ?? "");
    // 413: the request is larger than this tier's per-minute token allowance, so waiting will not help.
    if (res.status === 413 || /per day|\bRPD\b|\bTPD\b/i.test(text) || (after ?? 0) > 120) throw dailyLimit(req.model, after);
    throw new LlmError(`${req.model.label}의 분당 한도에 걸렸습니다.`, res.status, "rate", after ?? 20);
  }
  if (res.status === 401 || res.status === 403) throw new LlmError("API 키가 올바르지 않거나 권한이 없습니다.", 400);
  if (!res.ok) throw new LlmError(`평가 모델 오류 (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    data: parseJson(body.choices?.[0]?.message?.content ?? "", req.schema),
    usage: { inputTokens: body.usage?.prompt_tokens ?? 0, outputTokens: body.usage?.completion_tokens ?? 0 },
  };
}

function parseJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(cleaned);
  } catch {
    throw new LlmError("평가 모델이 올바른 JSON을 돌려주지 않았습니다.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new LlmError("평가 결과의 형식이 맞지 않습니다.");
  return parsed.data;
}
