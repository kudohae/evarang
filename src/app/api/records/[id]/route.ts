import { guard } from "@/lib/server/access";
import { deleteRecord, ownsRecord, withStore } from "@/lib/server/store";

/** The candidate deletes their own research copy: the row and every recording. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;
  const secret = request.headers.get("x-record-secret") ?? "";
  return withStore(async () => {
    const owner = await ownsRecord(id, secret);
    if (owner === "denied") return Response.json({ error: "이 기록을 삭제할 권한이 없습니다." }, { status: 403 });
    if (owner === "new") return Response.json({ ok: true, deleted: 0 });
    return Response.json({ ok: true, deleted: await deleteRecord(id) });
  });
}
