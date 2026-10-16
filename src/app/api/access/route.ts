import { cookies } from "next/headers";
import { ACCESS_COOKIE, tokenFor } from "@/lib/server/access";
import { authConfigured } from "@/lib/server/auth";

/** The entry code, for a site without accounts. With accounts, members sign in instead (see guard). */
export async function POST(request: Request) {
  if (authConfigured()) return Response.json({ error: "로그인해서 이용하세요." }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const token = tokenFor(code);
  if (!token) {
    return Response.json({ error: "접근 코드가 맞지 않습니다." }, { status: 401 });
  }
  (await cookies()).set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return Response.json({ ok: true });
}
