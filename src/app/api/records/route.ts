import { z } from "zod";
import { guard } from "@/lib/server/access";
import { db, hashSecret, ownsRecord, RETENTION_DAYS, withStore } from "@/lib/server/store";

const Body = z.object({
  id: z.string().regex(/^[a-z0-9]{6,40}$/),
  secret: z.string().regex(/^[a-f0-9]{64}$/),
  consentVersion: z.string().max(40),
  // The whole result as the browser holds it, minus the local bookkeeping.
  result: z
    .object({
      createdAt: z.number(),
      startLevel: z.number().int(),
      finalLevel: z.number().int(),
      actualGrade: z.string().optional(),
      evaluations: z.array(z.object({ modelId: z.string(), overall: z.object({ grade: z.string() }).passthrough().optional() }).passthrough()),
    })
    .passthrough(),
});

/** Creates or updates the research copy of one test. Only the browser holding the secret can update it. */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  const { id, secret, consentVersion, result } = parsed.data;
  if (JSON.stringify(result).length > 900_000) return Response.json({ error: "기록이 너무 큽니다." }, { status: 413 });

  return withStore(async () => {
    const owner = await ownsRecord(id, secret);
    if (owner === "denied") return Response.json({ error: "이 기록을 바꿀 권한이 없습니다." }, { status: 403 });

    const latest = result.evaluations[result.evaluations.length - 1];
    const created = new Date(result.createdAt);
    const expires = new Date(created.getTime() + RETENTION_DAYS * 86_400_000);
    const sql = await db();
    await sql`
      INSERT INTO exam_records (id, delete_hash, consent_version, created_at, updated_at, expires_at, start_level, final_level, actual_grade, estimated_grade, eval_model, data)
      VALUES (${id}, ${hashSecret(secret)}, ${consentVersion}, ${created.toISOString()}, now(), ${expires.toISOString()}, ${result.startLevel}, ${result.finalLevel},
              ${result.actualGrade ?? null}, ${latest?.overall?.grade ?? null}, ${latest?.modelId ?? null}, ${JSON.stringify(result)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        updated_at = now(),
        actual_grade = EXCLUDED.actual_grade,
        estimated_grade = EXCLUDED.estimated_grade,
        eval_model = EXCLUDED.eval_model,
        final_level = EXCLUDED.final_level,
        data = EXCLUDED.data`;
    return Response.json({ ok: true });
  });
}
