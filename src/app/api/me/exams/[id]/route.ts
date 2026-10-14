import { guard } from "@/lib/server/access";
import { AuthError, handle, requireUser } from "@/lib/server/auth";
import { deleteExam, getExam, saveExam } from "@/lib/server/user-exams";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  return handle(
    async () => {
      const exam = await getExam(await requireUser(), (await params).id);
      if (!exam) throw new AuthError("기록이 없습니다.", 404);
      return Response.json(exam);
    },
    { read: true },
  );
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => null)) as { result?: Record<string, unknown> } | null;
    const r = body?.result;
    if (!r || typeof r.createdAt !== "number" || !Array.isArray(r.questions) || !Array.isArray(r.evaluations)) {
      throw new AuthError("요청 형식이 올바르지 않습니다.");
    }
    await saveExam(user, (await params).id, r as never);
    return Response.json({ ok: true });
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    await deleteExam(await requireUser(), (await params).id);
    return Response.json({ ok: true });
  });
}
