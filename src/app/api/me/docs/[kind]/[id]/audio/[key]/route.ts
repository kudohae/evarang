import { guard } from "@/lib/server/access";
import { handle, requireUser } from "@/lib/server/auth";
import { putDocAudio, readDocAudio } from "@/lib/server/docs";

export const maxDuration = 60;

type Params = { params: Promise<{ kind: string; id: string; key: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { kind, id, key } = await params;
  return handle(async () => readDocAudio(await requireUser(), kind, id, key), { read: true });
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { kind, id, key } = await params;
  return handle(async () => {
    const user = await requireUser();
    const body = Buffer.from(await request.arrayBuffer());
    await putDocAudio(user, kind, id, key, body, request.headers.get("content-type") || "audio/webm");
    return Response.json({ ok: true });
  });
}
