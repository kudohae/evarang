import { del, get, put } from "@vercel/blob";
import { isDocKind, KINDS, type Doc, type DocKind } from "@/lib/docs/kinds";
import { AuthError, sql, type User } from "@/lib/server/auth";

/*
  Documents a member keeps in their account, for members who agreed to it. One row per (member, kind, id);
  recordings as private blobs under users/{userId}/{kind}/{id}/{key}. A deletion keeps the row as a mark
  (no data, no recordings) so the member's other browsers learn of it.
  Separate from the research copy (exam_records), which has its own consent and retention.
*/

let schema: Promise<unknown> | null = null;

async function db() {
  const client = await sql();
  schema ??= (async () => {
    await client`
      CREATE TABLE IF NOT EXISTS user_docs (
        user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind        text NOT NULL,
        id          text NOT NULL,
        updated_at  timestamptz NOT NULL,
        deleted_at  timestamptz,
        summary     jsonb NOT NULL DEFAULT '{}'::jsonb,
        data        jsonb,
        audio       jsonb NOT NULL DEFAULT '{}'::jsonb,
        PRIMARY KEY (user_id, kind, id)
      )`;
    // Tests kept by the first version of account storage. The version is the test's own creation time,
    // which is what browsers holding the same legacy record think it is, so neither side looks newer.
    // Safe to run any number of times; user_exams is left in place and no longer written.
    const legacy = (await client`SELECT to_regclass('user_exams') IS NOT NULL AS present`) as { present: boolean }[];
    if (legacy[0]?.present) {
      await client`
        INSERT INTO user_docs (user_id, kind, id, updated_at, summary, data, audio)
        SELECT user_id, 'exam', id,
               COALESCE(to_timestamp((data->>'createdAt')::double precision / 1000), updated_at),
               jsonb_build_object('createdAt', (data->>'createdAt')::bigint, 'startLevel', start_level, 'finalLevel', final_level,
                                  'questionCount', question_count, 'grade', estimated_grade, 'model', eval_model),
               data, audio
        FROM user_exams
        ON CONFLICT DO NOTHING`;
    }
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

/** A write based on an older copy than the one stored. Equal versions are a resend of the same copy. */
export function isStale(incoming: number, stored: number | null): boolean {
  return stored !== null && incoming < stored;
}

const ID = /^[A-Za-z0-9_-]{6,64}$/;
const KEY = /^[a-z0-9_-]{1,40}$/;
const MAX_AUDIO = 4_400_000;

export function checkDocAddress(kind: string, id: string, key?: string): asserts kind is DocKind {
  if (!isDocKind(kind)) throw new AuthError("알 수 없는 기록 종류입니다.");
  if (!ID.test(id)) throw new AuthError("기록 번호가 올바르지 않습니다.");
  if (key !== undefined) {
    if (!KINDS[kind].hasAudio) throw new AuthError("이 기록에는 녹음을 둘 수 없습니다.");
    if (!KEY.test(key)) throw new AuthError("녹음 번호가 올바르지 않습니다.");
  }
}

function requireConsent(user: User): void {
  if (!user.recordsConsent) throw new AuthError("기록을 계정에 저장하는 데 먼저 동의해야 합니다.", 403);
}

type Row = { id: string; updated_ms: number; deleted_ms: number | null; summary: Record<string, unknown>; data: unknown };

function toDoc(kind: DocKind, r: Row): Doc {
  return { kind, id: r.id, updatedAt: Number(r.updated_ms), ...(r.deleted_ms !== null ? { deletedAt: Number(r.deleted_ms) } : {}), data: r.data ?? null };
}

export type DocSummary = { id: string; updatedAt: number; deletedAt?: number; summary: Record<string, unknown> };

export async function listDocs(user: User, kind: string): Promise<DocSummary[]> {
  if (!isDocKind(kind)) throw new AuthError("알 수 없는 기록 종류입니다.");
  const client = await db();
  const rows = (await client`
    SELECT id, floor(extract(epoch FROM updated_at) * 1000)::float8 AS updated_ms,
           floor(extract(epoch FROM deleted_at) * 1000)::float8 AS deleted_ms, summary
    FROM user_docs WHERE user_id = ${user.id} AND kind = ${kind} ORDER BY updated_at DESC LIMIT 500`) as Omit<Row, "data">[];
  return rows.map((r) => ({
    id: r.id,
    updatedAt: Number(r.updated_ms),
    ...(r.deleted_ms !== null ? { deletedAt: Number(r.deleted_ms) } : {}),
    summary: r.summary,
  }));
}

export async function getDoc(user: User, kind: string, id: string): Promise<(Doc & { audio: string[] }) | null> {
  checkDocAddress(kind, id);
  const client = await db();
  const rows = (await client`
    SELECT id, floor(extract(epoch FROM updated_at) * 1000)::float8 AS updated_ms,
           floor(extract(epoch FROM deleted_at) * 1000)::float8 AS deleted_ms, summary, data, audio
    FROM user_docs WHERE user_id = ${user.id} AND kind = ${kind} AND id = ${id}`) as (Row & { audio: Record<string, string> })[];
  if (!rows.length) return null;
  return { ...toDoc(kind, rows[0]), audio: Object.keys(rows[0].audio ?? {}) };
}

/** Stores a copy unless the account already holds a newer one, which is returned instead. */
export async function putDoc(user: User, kind: string, id: string, body: { updatedAt: number; data: unknown }): Promise<{ ok: true } | { conflict: Doc }> {
  requireConsent(user);
  checkDocAddress(kind, id);
  if (!Number.isFinite(body.updatedAt) || body.updatedAt <= 0 || body.data === null || typeof body.data !== "object") {
    throw new AuthError("요청 형식이 올바르지 않습니다.");
  }
  const json = JSON.stringify(body.data);
  if (json.length > KINDS[kind].maxBytes) throw new AuthError("기록이 너무 큽니다.", 413);
  const client = await db();

  const current = await getDoc(user, kind, id);
  if (current && isStale(body.updatedAt, current.updatedAt)) return { conflict: stripAudio(current) };

  const at = new Date(body.updatedAt).toISOString();
  const summary = JSON.stringify(KINDS[kind].summary(body.data));
  // Versions are kept to the millisecond, the precision browsers send. The WHERE guard closes the gap between the read above and this write.
  const rows = (await client`
    INSERT INTO user_docs (user_id, kind, id, updated_at, deleted_at, summary, data)
    VALUES (${user.id}, ${kind}, ${id}, ${at}, NULL, ${summary}::jsonb, ${json}::jsonb)
    ON CONFLICT (user_id, kind, id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at, deleted_at = NULL, summary = EXCLUDED.summary, data = EXCLUDED.data
    WHERE user_docs.updated_at <= EXCLUDED.updated_at
    RETURNING id`) as unknown[];
  if (!rows.length) {
    const newer = await getDoc(user, kind, id);
    if (newer) return { conflict: stripAudio(newer) };
  }
  return { ok: true };
}

function stripAudio(d: Doc & { audio?: string[] }): Doc {
  const { audio: _a, ...doc } = d;
  void _a;
  return doc;
}

async function audioPaths(userId: string, where?: { kind: DocKind; id: string }): Promise<string[]> {
  const client = await db();
  const rows = (where
    ? await client`SELECT audio FROM user_docs WHERE user_id = ${userId} AND kind = ${where.kind} AND id = ${where.id}`
    : await client`SELECT audio FROM user_docs WHERE user_id = ${userId}`) as { audio: Record<string, string> }[];
  return rows.flatMap((r) => Object.values(r.audio ?? {}));
}

async function deleteBlobs(paths: string[]): Promise<void> {
  if (!paths.length || !blobConfigured()) return;
  for (let i = 0; i < paths.length; i += 100) await del(paths.slice(i, i + 100));
}

/** Leaves a deletion mark; the data and recordings are gone. */
export async function deleteDoc(user: User, kind: string, id: string): Promise<void> {
  checkDocAddress(kind, id);
  await deleteBlobs(await audioPaths(user.id, { kind, id }));
  const client = await db();
  await client`
    INSERT INTO user_docs (user_id, kind, id, updated_at, deleted_at, data)
    VALUES (${user.id}, ${kind}, ${id}, date_trunc('milliseconds', now()), date_trunc('milliseconds', now()), NULL)
    ON CONFLICT (user_id, kind, id) DO UPDATE SET
      updated_at = EXCLUDED.updated_at, deleted_at = EXCLUDED.deleted_at, data = NULL, audio = '{}'::jsonb, summary = '{}'::jsonb`;
}

/** Every stored document and recording of one member; used when they turn storage off or withdraw. */
export async function removeAllDocs(userId: string): Promise<void> {
  await deleteBlobs(await audioPaths(userId));
  const client = await db();
  await client`DELETE FROM user_docs WHERE user_id = ${userId}`;
  // Otherwise the next start-up would copy the old rows back in.
  const legacy = (await client`SELECT to_regclass('user_exams') IS NOT NULL AS present`) as { present: boolean }[];
  if (legacy[0]?.present) await client`DELETE FROM user_exams WHERE user_id = ${userId}`;
}

export async function setRecordsConsent(user: User, agree: boolean): Promise<void> {
  const client = await db();
  if (agree) {
    await client`UPDATE users SET records_consent_at = COALESCE(records_consent_at, now()) WHERE id = ${user.id}`;
  } else {
    // Turning it off removes what was stored, so "off" never leaves copies behind.
    await removeAllDocs(user.id);
    await client`UPDATE users SET records_consent_at = NULL WHERE id = ${user.id}`;
  }
}

export async function putDocAudio(user: User, kind: string, id: string, key: string, body: Buffer, contentType: string): Promise<void> {
  requireConsent(user);
  checkDocAddress(kind, id, key);
  if (!blobConfigured()) throw new AuthError("녹음 저장소가 설정되지 않았습니다.", 503);
  if (!body.length || body.length > MAX_AUDIO) throw new AuthError("녹음 크기가 올바르지 않습니다.", 413);
  const client = await db();
  const owned = (await client`
    SELECT 1 FROM user_docs WHERE user_id = ${user.id} AND kind = ${kind} AND id = ${id} AND deleted_at IS NULL`) as unknown[];
  if (!owned.length) throw new AuthError("기록을 먼저 저장해야 합니다.", 404);
  const ext = contentType.includes("mp4") ? "m4a" : contentType.includes("ogg") ? "ogg" : "webm";
  const blob = await put(`users/${user.id}/${kind}/${id}/${key}.${ext}`, body, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: true });
  await client`
    UPDATE user_docs SET audio = audio || jsonb_build_object(${key}::text, ${blob.pathname}::text)
    WHERE user_id = ${user.id} AND kind = ${kind} AND id = ${id}`;
}

export async function readDocAudio(user: User, kind: string, id: string, key: string): Promise<Response> {
  checkDocAddress(kind, id, key);
  const client = await db();
  const rows = (await client`
    SELECT audio ->> ${key} AS path FROM user_docs WHERE user_id = ${user.id} AND kind = ${kind} AND id = ${id}`) as { path: string | null }[];
  const path = rows[0]?.path;
  if (!path || !blobConfigured()) return new Response("not found", { status: 404 });
  const blob = await get(path, { access: "private" });
  if (!blob || blob.statusCode !== 200) return new Response("not found", { status: 404 });
  return new Response(blob.stream, { headers: { "content-type": blob.blob.contentType, "cache-control": "private, no-store" } });
}
