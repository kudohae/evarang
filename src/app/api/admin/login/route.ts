import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminTokenFor } from "@/lib/server/access";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: unknown };
  const token = tokenOrNull(body.code);
  if (!token) return Response.json({ error: "관리자 코드가 맞지 않습니다." }, { status: 401 });
  (await cookies()).set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
  return Response.json({ ok: true });
}

function tokenOrNull(code: unknown) {
  return typeof code === "string" ? adminTokenFor(code.trim()) : null;
}
