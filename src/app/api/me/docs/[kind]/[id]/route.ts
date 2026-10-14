import { guard } from "@/lib/server/access";
import { apiError } from "@/lib/server/api-error";
import { AuthError, handle, requireUser } from "@/lib/server/auth";
import { deleteDoc, getDoc, putDoc } from "@/lib/server/docs";

type Params = { params: Promise<{ kind: string; id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { kind, id } = await params;
  return handle(
    async () => {
      const doc = await getDoc(await requireUser(), kind, id);
      if (!doc) throw new AuthError("기록이 없습니다.", 404);
      return Response.json(doc);
    },
    { read: true },
  );
}

/** Body `{ updatedAt, data }`. A copy older than the account's is refused with 409 and the account's copy. */
export async function PUT(request: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { kind, id } = await params;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { updatedAt?: unknown; data?: unknown } | null;
    if (!body || typeof body.updatedAt !== "number") throw new AuthError("요청 형식이 올바르지 않습니다.");
    const out = await putDoc(user, kind, id, { updatedAt: body.updatedAt, data: body.data });
    if ("conflict" in out) return apiError(409, "더 최근에 고친 기록이 있습니다.", { kind: "conflict", body: { doc: out.conflict } });
    return Response.json({ ok: true });
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  const { kind, id } = await params;
  return handle(async () => {
    await deleteDoc(await requireUser(), kind, id);
    return Response.json({ ok: true });
  });
}
