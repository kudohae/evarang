import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ACCESS_COOKIE = "evarang_access";

function expectedToken(code: string): string {
  return createHmac("sha256", code).update("evarang-access-v1").digest("hex");
}

export function accessRequired(): boolean {
  return Boolean(process.env.ACCESS_CODE);
}

export function tokenFor(code: string): string | null {
  const real = process.env.ACCESS_CODE;
  if (!real) return null;
  const a = Buffer.from(code);
  const b = Buffer.from(real);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return expectedToken(real);
}

export async function hasAccess(): Promise<boolean> {
  const real = process.env.ACCESS_CODE;
  if (!real) return true;
  const value = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expectedToken(real));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Returns a 401 response when the caller has not entered the access code. */
export async function guard(): Promise<Response | null> {
  if (await hasAccess()) return null;
  return Response.json({ error: "접근 코드가 필요합니다." }, { status: 401 });
}

// ── Admin ──────────────────────────────────────────────────
// Same scheme as the access code, with its own secret, for the research records.

export const ADMIN_COOKIE = "evarang_admin";

function adminToken(code: string): string {
  return createHmac("sha256", code).update("evarang-admin-v1").digest("hex");
}

export function adminTokenFor(code: string): string | null {
  const real = process.env.ADMIN_CODE;
  if (!real) return null;
  const a = Buffer.from(code);
  const b = Buffer.from(real);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return adminToken(real);
}

export async function isAdmin(): Promise<boolean> {
  const real = process.env.ADMIN_CODE;
  if (!real) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(adminToken(real));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function adminGuard(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ error: "관리자 코드가 필요합니다." }, { status: 401 });
}
