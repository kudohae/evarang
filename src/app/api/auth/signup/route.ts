import { guard } from "@/lib/server/access";
import { AuthError, handle, signUp } from "@/lib/server/auth";

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.agree !== true || body.age !== true) throw new AuthError("필수 항목에 동의해야 가입할 수 있습니다.");
    await signUp({ email: String(body.email ?? ""), password: String(body.password ?? ""), nickname: String(body.nickname ?? "") });
    return Response.json({ ok: true });
  });
}
