import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { aiProvider, type AiProviderId } from "@/lib/ai-providers";
import { AuthError, sql, type User } from "@/lib/server/auth";
import { databaseUrl } from "@/lib/server/sql";

/*
  Members' own AI keys. Stored encrypted (AES-256-GCM, key = SHA-256 of AI_KEY_SECRET); the plain key goes
  only to the provider, never back to a browser or into a log. One key per member.
*/

export function aiKeysConfigured(): boolean {
  return Boolean(process.env.AI_KEY_SECRET && databaseUrl());
}

function cipherKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptKey(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cipherKey(secret), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decryptKey(stored: string, secret: string): string {
  const [v, iv, tag, ct] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("unknown key format");
  const d = createDecipheriv("aes-256-gcm", cipherKey(secret), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}

export function keyHint(key: string): string {
  return key.trim().slice(-4);
}

/** Asks the provider whether the key works. Throws AuthError with a message for the member. */
export async function verifyKey(provider: string, key: string): Promise<void> {
  const p = aiProvider(provider);
  if (!p?.enabled) throw new AuthError("아직 쓸 수 없는 AI입니다.");
  let res: Response;
  try {
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AuthError("키를 확인하지 못했습니다. 잠시 후 다시 시도하세요.", 502);
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) throw new AuthError("API 키가 올바르지 않습니다.");
  if (!res.ok) throw new AuthError("키를 확인하지 못했습니다. 잠시 후 다시 시도하세요.", 502);
}

/** The key as typed: trimmed, printable, a sane length. */
export function checkKeyInput(raw: unknown): string {
  const key = typeof raw === "string" ? raw.trim() : "";
  if (key.length < 10 || key.length > 300 || !/^[\x21-\x7e]+$/.test(key)) throw new AuthError("API 키 형식이 올바르지 않습니다.");
  return key;
}

let schema: Promise<unknown> | null = null;

async function db() {
  if (!aiKeysConfigured()) throw new AuthError("API 키 기능이 설정되지 않았습니다.", 503);
  const client = await sql();
  schema ??= client`
    CREATE TABLE IF NOT EXISTS user_ai_keys (
      user_id     text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider    text NOT NULL,
      key_enc     text NOT NULL,
      hint        text NOT NULL,
      updated_at  timestamptz NOT NULL DEFAULT now()
    )`;
  try {
    await schema;
  } catch (e) {
    schema = null;
    throw e;
  }
  return client;
}

export type KeySummary = { provider: AiProviderId; hint: string; updatedAt: string };

export async function keySummary(userId: string): Promise<KeySummary | null> {
  if (!aiKeysConfigured()) return null;
  const client = await db();
  const rows = (await client`SELECT provider, hint, updated_at FROM user_ai_keys WHERE user_id = ${userId}`) as {
    provider: AiProviderId;
    hint: string;
    updated_at: string;
  }[];
  return rows[0] ? { provider: rows[0].provider, hint: rows[0].hint, updatedAt: new Date(rows[0].updated_at).toISOString() } : null;
}

/** Saves a key that was already checked with verifyKey. */
export async function storeKey(userId: string, provider: AiProviderId, key: string): Promise<void> {
  const client = await db();
  const enc = encryptKey(key, process.env.AI_KEY_SECRET!);
  await client`
    INSERT INTO user_ai_keys (user_id, provider, key_enc, hint, updated_at)
    VALUES (${userId}, ${provider}, ${enc}, ${keyHint(key)}, now())
    ON CONFLICT (user_id) DO UPDATE SET provider = EXCLUDED.provider, key_enc = EXCLUDED.key_enc, hint = EXCLUDED.hint, updated_at = now()`;
}

export async function removeKey(user: User): Promise<void> {
  const client = await db();
  await client`DELETE FROM user_ai_keys WHERE user_id = ${user.id}`;
}

/** The member's plain key for one provider, or null. Server-side use only. */
export async function memberKey(userId: string, provider: AiProviderId): Promise<string | null> {
  if (!aiKeysConfigured()) return null;
  const client = await db();
  const rows = (await client`SELECT key_enc FROM user_ai_keys WHERE user_id = ${userId} AND provider = ${provider}`) as { key_enc: string }[];
  if (!rows[0]) return null;
  try {
    return decryptKey(rows[0].key_enc, process.env.AI_KEY_SECRET!);
  } catch {
    // The secret changed: the stored key can no longer be read, so it is as good as absent.
    return null;
  }
}
