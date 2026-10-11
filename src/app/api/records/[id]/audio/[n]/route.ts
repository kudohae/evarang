import { put } from "@vercel/blob";
import { guard } from "@/lib/server/access";
import { db, ownsRecord, withStore } from "@/lib/server/store";

export const maxDuration = 60;

const MAX_BYTES = 4_400_000;

/** Stores one answer's recording as a private blob and notes its path on the record. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const denied = await guard();
  if (denied) return denied;
  const { id, n } = await params;
  const number = Number(n);
  if (!Number.isInteger(number) || number < 1 || number > 15) return Response.json({ error: "문항 번호가 올바르지 않습니다." }, { status: 400 });
  return withStore(async () => {
    const owner = await ownsRecord(id, request.headers.get("x-record-secret") ?? "");
    if (owner !== "owner") return Response.json({ error: "기록을 먼저 저장해야 합니다." }, { status: 403 });

    const body = Buffer.from(await request.arrayBuffer());
    if (!body.length || body.length > MAX_BYTES) return Response.json({ error: "녹음 크기가 올바르지 않습니다." }, { status: 413 });
    const contentType = request.headers.get("content-type") || "audio/webm";
    const ext = contentType.includes("mp4") ? "m4a" : contentType.includes("ogg") ? "ogg" : "webm";
    try {
      const blob = await put(`exams/${id}/${number}.${ext}`, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
      const sql = await db();
      await sql`UPDATE exam_records SET audio = audio || jsonb_build_object(${String(number)}::text, ${blob.pathname}::text), updated_at = now() WHERE id = ${id}`;
      return Response.json({ ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ error: `녹음 저장 실패: ${msg.slice(0, 200)}` }, { status: 502 });
    }
  });
}
