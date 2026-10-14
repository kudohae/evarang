import { guard } from "@/lib/server/access";
import { handle, requireUser } from "@/lib/server/auth";
import { readAudio, saveAudio } from "@/lib/server/user-exams";

export const maxDuration = 60;

type Params = { params: Promise<{ id: string; n: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { id, n } = await params;
  return handle(async () => readAudio(await requireUser(), id, Number(n)), { read: true });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { id, n } = await params;
  return handle(async () => {
    const user = await requireUser();
    const body = Buffer.from(await request.arrayBuffer());
    await saveAudio(user, id, Number(n), body, request.headers.get("content-type") || "audio/webm");
    return Response.json({ ok: true });
  });
}
