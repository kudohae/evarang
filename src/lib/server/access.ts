import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { authConfigured, currentUser } from "@/lib/server/auth";

/**
 * Who may use the site: with accounts set up, only signed-in members. Without accounts (local development,
 * tests) there is nobody to sign in, so it is open.
 */
export async function signedIn(): Promise<boolean> {
  if (!authConfigured()) return true;
  return Boolean(await currentUser().catch(() => null));
}

/** Returns a 401 response when the caller has not signed in (see signedIn). */
export async function guard(): Promise<Response | null> {
  if (await signedIn()) return null;
  return Response.json({ error: "로그인이 필요합니다.", kind: "login" }, { status: 401 });
}

// ── Admin ──────────────────────────────────────────────────
// A code of its own, for the research records.

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
