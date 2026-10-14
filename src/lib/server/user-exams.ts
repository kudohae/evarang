import { del, get, put } from "@vercel/blob";
import { AuthError, sql, type User } from "@/lib/server/auth";

/*
  Test records kept in a member's account, for members who agreed to it.
  One row per test; recordings as private blobs under users/{userId}/exams/{examId}/.
  Separate from the research copy (exam_records), which has its own consent and retention.
*/

let schema: Promise<unknown> | null = null;

async function db() {
  const client = await sql();
  schema ??= (async () => {
    await client`
      CREATE TABLE IF NOT EXISTS user_exams (
        id               text PRIMARY KEY,
        user_id          text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at       timestamptz NOT NULL,
        updated_at       timestamptz NOT NULL DEFAULT now(),
        start_level      int,
        final_level      int,
        question_count   int,
        estimated_grade  text,
        eval_model       text,
        data             jsonb NOT NULL,
        audio            jsonb NOT NULL DEFAULT '{}'::jsonb
      )`;
    await client`CREATE INDEX IF NOT EXISTS user_exams_user ON user_exams (user_id, created_at DESC)`;
  })();
  try {
    await schema;
  } catch (e) {
    schema = null;
    throw e;
  }
  return client;
}

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

const ID = /^[a-z0-9]{6,40}$/;

export function checkExamId(id: string): void {
  if (!ID.test(id)) throw new AuthError("기록 번호가 올바르지 않습니다.");
}

export async function setRecordsConsent(user: User, agree: boolean): Promise<void> {
  const client = await db();
  if (agree) {
    await client`UPDATE users SET records_consent_at = COALESCE(records_consent_at, now()) WHERE id = ${user.id}`;
  } else {
    // Turning it off removes what was stored, so "off" never leaves copies behind.
    await removeAllExams(user.id);
    await client`UPDATE users SET records_consent_at = NULL WHERE id = ${user.id}`;
  }
}

function requireConsent(user: User): void {
  if (!user.recordsConsent) throw new AuthError("시험 기록을 계정에 저장하는 데 먼저 동의해야 합니다.", 403);
}

export type ExamSummary = {
  id: string;
  createdAt: string;
  startLevel: number | null;
  finalLevel: number | null;
  questionCount: number | null;
  grade: string | null;
  model: string | null;
};

export async function listExams(user: User): Promise<ExamSummary[]> {
  const client = await db();
  const rows = (await client`
    SELECT id, created_at, start_level, final_level, question_count, estimated_grade, eval_model
    FROM user_exams WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 200`) as {
    id: string;
    created_at: string;
    start_level: number | null;
    final_level: number | null;
    question_count: number | null;
    estimated_grade: string | null;
    eval_model: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    startLevel: r.start_level,
    finalLevel: r.final_level,
    questionCount: r.question_count,
    grade: r.estimated_grade,
    model: r.eval_model,
  }));
}

type StoredResult = {
  createdAt: number;
  startLevel: number;
  finalLevel: number;
  questions: unknown[];
  evaluations: { modelId: string; overall?: { grade: string } }[];
};

export async function saveExam(user: User, id: string, result: StoredResult): Promise<void> {
  requireConsent(user);
  checkExamId(id);
  if (JSON.stringify(result).length > 900_000) throw new AuthError("기록이 너무 큽니다.", 413);
  const client = await db();
  const latest = result.evaluations[result.evaluations.length - 1];
  const rows = (await client`
    INSERT INTO user_exams (id, user_id, created_at, start_level, final_level, question_count, estimated_grade, eval_model, data)
    VALUES (${id}, ${user.id}, ${new Date(result.createdAt).toISOString()}, ${result.startLevel}, ${result.finalLevel}, ${result.questions.length},
            ${latest?.overall?.grade ?? null}, ${latest?.modelId ?? null}, ${JSON.stringify(result)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET
      updated_at = now(),
      final_level = EXCLUDED.final_level,
      estimated_grade = EXCLUDED.estimated_grade,
      eval_model = EXCLUDED.eval_model,
      data = EXCLUDED.data
    WHERE user_exams.user_id = EXCLUDED.user_id
    RETURNING id`) as unknown[];
  // The id exists under another account: never overwrite someone else's record.
  if (!rows.length) throw new AuthError("이 기록을 저장할 수 없습니다.", 409);
}

export async function getExam(user: User, id: string): Promise<{ data: unknown; audio: number[] } | null> {
  checkExamId(id);
  const client = await db();
  const rows = (await client`SELECT data, audio FROM user_exams WHERE id = ${id} AND user_id = ${user.id}`) as {
    data: unknown;
    audio: Record<string, string>;
  }[];
  if (!rows.length) return null;
  return { data: rows[0].data, audio: Object.keys(rows[0].audio).map(Number) };
}

async function audioPaths(userId: string, id?: string): Promise<string[]> {
  const client = await db();
  const rows = (id
    ? await client`SELECT audio FROM user_exams WHERE user_id = ${userId} AND id = ${id}`
    : await client`SELECT audio FROM user_exams WHERE user_id = ${userId}`) as { audio: Record<string, string> }[];
  return rows.flatMap((r) => Object.values(r.audio ?? {}));
}

async function deleteBlobs(paths: string[]): Promise<void> {
  if (!paths.length || !blobConfigured()) return;
  for (let i = 0; i < paths.length; i += 100) await del(paths.slice(i, i + 100));
}

export async function deleteExam(user: User, id: string): Promise<void> {
  checkExamId(id);
  await deleteBlobs(await audioPaths(user.id, id));
  const client = await db();
  await client`DELETE FROM user_exams WHERE id = ${id} AND user_id = ${user.id}`;
}

/** Every stored test and recording of one member; used when they turn storage off or withdraw. */
export async function removeAllExams(userId: string): Promise<void> {
  await deleteBlobs(await audioPaths(userId));
  const client = await db();
  await client`DELETE FROM user_exams WHERE user_id = ${userId}`;
}

const MAX_AUDIO = 4_400_000;

export async function saveAudio(user: User, id: string, n: number, body: Buffer, contentType: string): Promise<void> {
  requireConsent(user);
  checkExamId(id);
  if (!Number.isInteger(n) || n < 1 || n > 15) throw new AuthError("문항 번호가 올바르지 않습니다.");
  if (!blobConfigured()) throw new AuthError("녹음 저장소가 설정되지 않았습니다.", 503);
  if (!body.length || body.length > MAX_AUDIO) throw new AuthError("녹음 크기가 올바르지 않습니다.", 413);
  const client = await db();
  const owned = (await client`SELECT 1 FROM user_exams WHERE id = ${id} AND user_id = ${user.id}`) as unknown[];
  if (!owned.length) throw new AuthError("기록을 먼저 저장해야 합니다.", 404);
  const ext = contentType.includes("mp4") ? "m4a" : contentType.includes("ogg") ? "ogg" : "webm";
  const blob = await put(`users/${user.id}/exams/${id}/${n}.${ext}`, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
  await client`
    UPDATE user_exams SET audio = audio || jsonb_build_object(${String(n)}::text, ${blob.pathname}::text), updated_at = now()
    WHERE id = ${id} AND user_id = ${user.id}`;
}

export async function readAudio(user: User, id: string, n: number): Promise<Response> {
  checkExamId(id);
  const client = await db();
  const rows = (await client`SELECT audio ->> ${String(n)} AS path FROM user_exams WHERE id = ${id} AND user_id = ${user.id}`) as { path: string | null }[];
  const path = rows[0]?.path;
  if (!path || !blobConfigured()) return new Response("not found", { status: 404 });
  const blob = await get(path, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("not found", { status: 404 });
  return new Response(blob.stream, { headers: { "content-type": blob.blob.contentType, "cache-control": "private, no-store" } });
}
