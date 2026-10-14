import { guard } from "@/lib/server/access";
import { deleteAccount, handle, requireUser, updateProfile } from "@/lib/server/auth";
import { removeAllExams } from "@/lib/server/user-exams";

/** Edits the nickname and/or email. Changing the email needs the current password. */
export async function PATCH(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await updateProfile(user, {
      nickname: typeof body.nickname === "string" ? body.nickname : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      currentPassword: typeof body.currentPassword === "string" ? body.currentPassword : undefined,
    });
    return Response.json({ ok: true });
  });
}

/** Withdrawal. */
export async function DELETE(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await deleteAccount(user, String(body.password ?? ""), () => removeAllExams(user.id));
    return Response.json({ ok: true });
  });
}
