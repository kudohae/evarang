import { guard } from "@/lib/server/access";
import { changePassword, handle, requireUser } from "@/lib/server/auth";

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await changePassword(user, String(body.currentPassword ?? ""), String(body.newPassword ?? ""));
    return Response.json({ ok: true });
  });
}
