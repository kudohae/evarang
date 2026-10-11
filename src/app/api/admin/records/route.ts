import { adminGuard } from "@/lib/server/access";
import { db, purgeExpired, withStore } from "@/lib/server/store";

export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  return withStore(async () => {
    await purgeExpired();
    const sql = await db();
    const rows = await sql`
      SELECT id, created_at, expires_at, start_level, final_level, actual_grade, estimated_grade, eval_model,
             (SELECT count(*)::int FROM jsonb_object_keys(audio)) AS audio_count
      FROM exam_records ORDER BY created_at DESC LIMIT 500`;
    return Response.json({ records: rows });
  });
}
