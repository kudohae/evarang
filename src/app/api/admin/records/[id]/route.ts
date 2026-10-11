import { adminGuard } from "@/lib/server/access";
import { db, deleteRecord, withStore } from "@/lib/server/store";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  return withStore(async () => {
    const sql = await db();
    const rows = (await sql`SELECT data, audio FROM exam_records WHERE id = ${id}`) as { data: unknown; audio: Record<string, string> }[];
    if (!rows.length) return Response.json({ error: "기록이 없습니다." }, { status: 404 });
    return Response.json(rows[0]);
  });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  return withStore(async () => Response.json({ ok: true, deleted: await deleteRecord(id) }));
}
