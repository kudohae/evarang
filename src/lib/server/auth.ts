import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { cookies, headers } from "next/headers";
import { apiError } from "@/lib/server/api-error";
import { databaseUrl, neonClient } from "@/lib/server/sql";

/*
  Email and password accounts, kept in the same Postgres database as the research records.
  Passwords are stored as scrypt hashes; sessions are random tokens in an httpOnly cookie,
  and only the token's SHA-256 is stored, so a leaked table cannot be replayed as a login.
*/

export const SESSION_COOKIE = "evarang_session";
const SESSION_DAYS = 30;
/** Version of the member consent text shown at sign-up; bump it when that text changes. */
export const MEMBER_CONSENT_VERSION = "2026-10-14";

export type User = { id: string; email: string; nickname: string; createdAt: string; recordsConsent: boolean };

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

// ── Database ───────────────────────────────────────────────

let client: NeonQueryFunction<false, false> | null = null;
let schema: Promise<unknown> | null = null;

export function authConfigured(): boolean {
  return Boolean(databaseUrl());
}

/** The accounts database, with its tables created on first use. Other account features build on it. */
export async function sql(): Promise<NeonQueryFunction<false, false>> {
  if (!databaseUrl()) throw new AuthError("회원 기능이 아직 설정되지 않았습니다.", 503);
  client ??= neonClient();
  schema ??= (async () => {
    await client!`
      CREATE TABLE IF NOT EXISTS users (
        id                text PRIMARY KEY,
        email             text NOT NULL UNIQUE,
        password_hash     text NOT NULL,
        nickname          text NOT NULL,
        consent_version   text NOT NULL,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
      )`;
    await client!`
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash  text PRIMARY KEY,
        user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  timestamptz NOT NULL DEFAULT now(),
        expires_at  timestamptz NOT NULL
      )`;
    await client!`CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)`;
    // Set when the member agrees to keep their test records in the account.
    await client!`ALTER TABLE users ADD COLUMN IF NOT EXISTS records_consent_at timestamptz`;
    await client!`
      CREATE TABLE IF NOT EXISTS auth_attempts (
        key       text PRIMARY KEY,
        count     int NOT NULL,
        reset_at  timestamptz NOT NULL
      )`;
  })();
  try {
    await schema;
  } catch (e) {
    schema = null;
    throw e;
  }
  return client;
}

// ── Passwords ──────────────────────────────────────────────

// N=2^15 uses 32 MB per hash: slow enough to resist guessing, light enough for a serverless function.
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LEN = 32;

function scrypt(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key))));
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, key] = stored.split("$");
  if (algo !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64url");
  const actual = await scrypt(password, Buffer.from(salt, "base64url"), { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Compared against when the email is unknown, so a missing account takes as long to reject as a wrong password.
let dummyHash: Promise<string> | null = null;

// ── Rules ──────────────────────────────────────────────────

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function checkEmail(email: string): void {
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("이메일 형식이 올바르지 않습니다.");
}

export function checkPassword(password: string, email: string): void {
  if (password.length < 8) throw new AuthError("비밀번호는 8자 이상이어야 합니다.");
  if (password.length > 128) throw new AuthError("비밀번호는 128자 이하여야 합니다.");
  if (password.toLowerCase() === email) throw new AuthError("비밀번호를 이메일과 다르게 정하세요.");
}

export function checkNickname(raw: string): string {
  const nickname = raw.trim().replace(/\s+/g, " ");
  if (nickname.length < 1 || nickname.length > 20) throw new AuthError("닉네임은 1~20자로 정하세요.");
  return nickname;
}

/** Mutating requests must come from this site's own pages; the session cookie is SameSite=Lax as a second line. */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) throw new AuthError("잘못된 요청입니다.", 403);
  try {
    if (new URL(origin).host !== host) throw new Error();
  } catch {
    throw new AuthError("잘못된 요청입니다.", 403);
  }
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}

/** Counts an attempt against `key`; throws once `limit` is reached within the window. */
async function limit(key: string, max: number, windowMinutes: number): Promise<void> {
  const db = await sql();
  const rows = (await db`
    INSERT INTO auth_attempts (key, count, reset_at) VALUES (${key}, 1, now() + make_interval(mins => ${windowMinutes}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN auth_attempts.reset_at < now() THEN 1 ELSE auth_attempts.count + 1 END,
      reset_at = CASE WHEN auth_attempts.reset_at < now() THEN EXCLUDED.reset_at ELSE auth_attempts.reset_at END
    RETURNING count`) as { count: number }[];
  if (rows[0].count > max) throw new AuthError("시도가 너무 많습니다. 잠시 후 다시 시도하세요.", 429);
}

async function clearLimit(key: string): Promise<void> {
  const db = await sql();
  await db`DELETE FROM auth_attempts WHERE key = ${key}`;
}

// ── Sessions ───────────────────────────────────────────────

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

async function startSession(userId: string): Promise<void> {
  const db = await sql();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${tokenHash(token)}, ${userId}, ${expires.toISOString()})`;
  // Expired sessions are swept whenever someone signs in.
  await db`DELETE FROM sessions WHERE expires_at < now()`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** The signed-in user, or null. Never throws for a missing or stale cookie. */
export async function currentUser(): Promise<User | null> {
  if (!authConfigured()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await sql();
  const rows = (await db`
    SELECT u.id, u.email, u.nickname, u.created_at, u.records_consent_at
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now()`) as {
    id: string;
    email: string;
    nickname: string;
    created_at: string;
    records_consent_at: string | null;
  }[];
  const r = rows[0];
  return r
    ? { id: r.id, email: r.email, nickname: r.nickname, createdAt: new Date(r.created_at).toISOString(), recordsConsent: Boolean(r.records_consent_at) }
    : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new AuthError("로그인이 필요합니다.", 401);
  return user;
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && authConfigured()) {
    const db = await sql();
    await db`DELETE FROM sessions WHERE token_hash = ${tokenHash(token)}`;
  }
  jar.delete(SESSION_COOKIE);
}

// ── Accounts ───────────────────────────────────────────────

export async function signUp(input: { email: string; password: string; nickname: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  checkEmail(email);
  checkPassword(input.password, email);
  const nickname = checkNickname(input.nickname);
  await limit(`signup:${await clientIp()}`, 10, 60);
  const db = await sql();
  const id = randomBytes(12).toString("base64url");
  const rows = (await db`
    INSERT INTO users (id, email, password_hash, nickname, consent_version)
    VALUES (${id}, ${email}, ${await hashPassword(input.password)}, ${nickname}, ${MEMBER_CONSENT_VERSION})
    ON CONFLICT (email) DO NOTHING
    RETURNING id`) as { id: string }[];
  if (!rows.length) throw new AuthError("이미 가입된 이메일입니다.", 409);
  await startSession(id);
}

export async function signIn(input: { email: string; password: string }): Promise<void> {
  const email = normalizeEmail(input.email);
  await limit(`login:${email}`, 10, 15);
  await limit(`login-ip:${await clientIp()}`, 50, 15);
  const db = await sql();
  const rows = (await db`SELECT id, password_hash FROM users WHERE email = ${email}`) as { id: string; password_hash: string }[];
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  const ok = await verifyPassword(input.password, rows[0]?.password_hash ?? (await dummyHash));
  if (!rows[0] || !ok) throw new AuthError("이메일 또는 비밀번호가 맞지 않습니다.", 401);
  await clearLimit(`login:${email}`);
  await startSession(rows[0].id);
}

async function confirmPassword(user: User, password: string): Promise<void> {
  await limit(`confirm:${user.id}`, 10, 15);
  const db = await sql();
  const rows = (await db`SELECT password_hash FROM users WHERE id = ${user.id}`) as { password_hash: string }[];
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) throw new AuthError("현재 비밀번호가 맞지 않습니다.", 403);
  await clearLimit(`confirm:${user.id}`);
}

export async function updateProfile(user: User, input: { nickname?: string; email?: string; currentPassword?: string }): Promise<void> {
  // Validate everything first, so a rejected email change does not leave a half-saved profile.
  const nickname = input.nickname === undefined ? undefined : checkNickname(input.nickname);
  const email = input.email === undefined ? undefined : normalizeEmail(input.email);
  if (email !== undefined) checkEmail(email);
  const emailChanges = email !== undefined && email !== user.email;
  const db = await sql();
  if (emailChanges) {
    // The address is the login itself, so changing it needs the password, like changing the password does.
    await confirmPassword(user, input.currentPassword ?? "");
    const taken = (await db`SELECT 1 FROM users WHERE email = ${email} AND id <> ${user.id}`) as unknown[];
    if (taken.length) throw new AuthError("이미 가입된 이메일입니다.", 409);
  }
  await db`
    UPDATE users SET
      nickname = ${nickname ?? user.nickname},
      email = ${emailChanges ? email! : user.email},
      updated_at = now()
    WHERE id = ${user.id}`;
}

/** Changes the password and signs out every other device. */
export async function changePassword(user: User, currentPassword: string, newPassword: string): Promise<void> {
  await confirmPassword(user, currentPassword);
  checkPassword(newPassword, user.email);
  const db = await sql();
  await db`UPDATE users SET password_hash = ${await hashPassword(newPassword)}, updated_at = now() WHERE id = ${user.id}`;
  await db`DELETE FROM sessions WHERE user_id = ${user.id}`;
  await startSession(user.id);
}

/** Withdrawal: `cleanup` removes what hangs off the account (stored recordings), then the account and its sessions go. */
export async function deleteAccount(user: User, password: string, cleanup: () => Promise<void>): Promise<void> {
  await confirmPassword(user, password);
  await cleanup();
  const db = await sql();
  await db`DELETE FROM users WHERE id = ${user.id}`;
  await db`DELETE FROM auth_attempts WHERE key = ${`confirm:${user.id}`}`;
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Wraps an account route: same-origin check for anything that changes data, AuthError → JSON response,
 * anything else → 502. Browsers send no Origin header on same-origin GETs, so reads skip the check.
 */
export async function handle(run: () => Promise<Response>, { read = false }: { read?: boolean } = {}): Promise<Response> {
  try {
    if (!read) await assertSameOrigin();
    return await run();
  } catch (e) {
    if (e instanceof AuthError) return apiError(e.status, e.message, { kind: e.status === 401 || e.status === 403 ? "auth" : e.status === 429 ? "rate" : "invalid" });
    console.error("auth error:", e);
    return apiError(502, "잠시 후 다시 시도하세요. 서버에서 오류가 났습니다.");
  }
}
