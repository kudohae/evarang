import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { ModelOption, Provider, Usage } from "@/lib/models";

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

type Request<T> = {
  model: ModelOption;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Anthropic effort; other providers ignore it. */
  effort: "low" | "medium" | "high";
};

export type LlmResult<T> = { data: T; usage: Usage };

const ENV_KEY: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  xai: "XAI_API_KEY",
};

export function providerConfigured(p: Provider): boolean {
  return Boolean(process.env[ENV_KEY[p]]);
}

export async function generate<T>(req: Request<T>): Promise<LlmResult<T>> {
  if (!providerConfigured(req.model.provider)) {
    throw new LlmError(`${req.model.label}의 API 키가 서버에 설정되지 않았습니다.`, 400);
  }
  switch (req.model.provider) {
    case "anthropic":
      return anthropic(req);
    case "gemini":
      return withRetry(() => gemini(req));
    case "groq":
      return withRetry(() => openaiCompatible(req, "https://api.groq.com/openai/v1", process.env.GROQ_API_KEY!, groqModel()));
    case "xai":
      return withRetry(async () => openaiCompatible(req, "https://api.x.ai/v1", process.env.XAI_API_KEY!, await xaiModel()));
  }
}

/** Free providers occasionally return JSON that fails validation; one retry fixes most of it. */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LlmError && e.status < 500) throw e;
    return fn();
  }
}

// ── Anthropic ──────────────────────────────────────────────

let anthropicClient: Anthropic | null = null;

async function anthropic<T>(req: Request<T>): Promise<LlmResult<T>> {
  anthropicClient ??= new Anthropic();
  // Server-side fallback re-runs a declined request on another model inside the same call.
  // Haiku has no server-side fallback, so it goes without.
  const fallback = req.model.id !== "claude-haiku-5-5";
  try {
    const res = await anthropicClient.beta.messages.parse({
      model: req.model.id,
      max_tokens: 16000,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: { effort: req.effort, format: betaZodOutputFormat(req.schema) },
      ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (res.stop_reason === "refusal") throw new LlmError("모델이 이 요청의 평가를 거절했습니다.");
    if (res.stop_reason === "max_tokens") throw new LlmError("평가 결과가 너무 길어 중간에 잘렸습니다.");
    if (!res.parsed_output) throw new LlmError("평가 결과를 해석하지 못했습니다.");
    return {
      data: res.parsed_output as T,
      usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens },
    };
  } catch (e) {
    if (e instanceof LlmError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new LlmError("Anthropic API 키가 올바르지 않습니다.", 400);
    if (e instanceof Anthropic.RateLimitError) throw new LlmError("Anthropic 요청 한도를 넘었습니다. 잠시 후 다시 시도하세요.", 429);
    if (e instanceof Anthropic.APIError) throw new LlmError(`Anthropic 오류 (${e.status}): ${e.message}`);
    throw e;
  }
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
    const msg = e instanceof Error ? e.message : String(e);
    if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
      throw new LlmError("Gemini 무료 등급의 요청 한도를 넘었습니다. 다른 모델을 고르거나 나중에 다시 시도하세요.", 429);
    }
    throw new LlmError(`Gemini 오류: ${msg.slice(0, 300)}`);
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

// ── OpenAI-compatible (Groq, xAI) ─────────────────────────

function groqModel(): string {
  return process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
}

let xaiModelCache: string | null = null;

/** xAI renames models often, so pick a current fast text model from the live list unless one is pinned. */
async function xaiModel(): Promise<string> {
  if (process.env.XAI_MODEL) return process.env.XAI_MODEL;
  if (xaiModelCache) return xaiModelCache;
  const res = await fetch("https://api.x.ai/v1/models", {
    headers: { authorization: `Bearer ${process.env.XAI_API_KEY}` },
  });
  if (!res.ok) throw new LlmError(`xAI 모델 목록을 불러오지 못했습니다 (${res.status}).`, res.status === 401 ? 400 : 502);
  const body = (await res.json()) as { data?: { id: string }[] };
  const ids = (body.data ?? []).map((m) => m.id).filter((id) => !/image|vision|imagine|video|code|tts|embed/i.test(id));
  const chosen = ids.find((id) => /fast/i.test(id) && !/non-reasoning/i.test(id)) ?? ids[0];
  if (!chosen) throw new LlmError("사용할 수 있는 xAI 모델이 없습니다.");
  xaiModelCache = chosen;
  return chosen;
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
  if (res.status === 429) throw new LlmError("요청 한도를 넘었습니다. 잠시 후 다시 시도하세요.", 429);
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
