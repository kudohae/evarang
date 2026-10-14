import { guard } from "@/lib/server/access";
import { handle, requireUser } from "@/lib/server/auth";
import { setRecordsConsent } from "@/lib/server/user-exams";

/** Turns account storage of test records on, or off (which deletes what was stored). */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as { agree?: unknown };
    await setRecordsConsent(user, body.agree === true);
    return Response.json({ ok: true });
  });
}
