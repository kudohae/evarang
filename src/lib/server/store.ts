import { createHash } from "node:crypto";
import type { NeonQueryFunction } from "@neondatabase/serverless";
import { del } from "@vercel/blob";
import { databaseUrl, neonClient } from "@/lib/server/sql";

/*
  Research storage for candidates who opted in.
  One row per test in Postgres (Neon); recordings as private blobs under exams/{id}/.
  Each record carries the hash of a secret that only the candidate's browser holds,
  so only they can update or delete it.
*/

export const RETENTION_DAYS = 730;

let client: NeonQueryFunction<false, false> | null = null;
let schema: Promise<unknown> | null = null;

/** Newer Vercel projects connect Blob with BLOB_STORE_ID and authenticate through OIDC; older ones get a read-write token. */
export function storageConfigured(): boolean {
  return Boolean(databaseUrl() && (process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN));
}

export async function db(): Promise<NeonQueryFunction<false, false>> {
  client ??= neonClient();
  schema ??= client`
    CREATE TABLE IF NOT EXISTS exam_records (
      id               text PRIMARY KEY,
      delete_hash      text NOT NULL,
      consent_version  text NOT NULL,
      created_at       timestamptz NOT NULL,
      updated_at       timestamptz NOT NULL DEFAULT now(),
      expires_at       timestamptz NOT NULL,
      start_level      int,
      final_level      int,
      actual_grade     text,
      estimated_grade  text,
      eval_model       text,
      data             jsonb NOT NULL,
      audio            jsonb NOT NULL DEFAULT '{}'::jsonb
    )`.then(() => client!`CREATE INDEX IF NOT EXISTS exam_records_expires ON exam_records (expires_at)`);
  await schema;
  return client;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(`evarang-record:${secret}`).digest("hex");
}

/** True when the record does not exist yet or the secret matches its owner. */
export async function ownsRecord(id: string, secret: string): Promise<"new" | "owner" | "denied"> {
  const sql = await db();
  const rows = (await sql`SELECT delete_hash FROM exam_records WHERE id = ${id}`) as { delete_hash: string }[];
  if (!rows.length) return "new";
  return rows[0].delete_hash === hashSecret(secret) ? "owner" : "denied";
}

async function deleteBlobs(audio: Record<string, string> | null | undefined) {
  const paths = Object.values(audio ?? {});
  if (paths.length) await del(paths);
}

export async function deleteRecord(id: string) {
  const sql = await db();
  const rows = (await sql`DELETE FROM exam_records WHERE id = ${id} RETURNING audio`) as { audio: Record<string, string> }[];
  for (const r of rows) await deleteBlobs(r.audio);
  return rows.length;
}

/** Removes every record past its retention date, recordings included. */
export async function purgeExpired(): Promise<number> {
  const sql = await db();
  const rows = (await sql`DELETE FROM exam_records WHERE expires_at < now() RETURNING audio`) as { audio: Record<string, string> }[];
  for (const r of rows) await deleteBlobs(r.audio);
  return rows.length;
}

/** Runs a storage handler and turns database or blob failures into a readable 502 instead of a bare 500. */
export async function withStore(run: () => Promise<Response>): Promise<Response> {
  if (!storageConfigured()) return Response.json({ error: "저장소가 설정되지 않았습니다." }, { status: 503 });
  try {
    return await run();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("storage error:", e);
    return Response.json({ error: `저장소에 연결하지 못했습니다: ${msg.slice(0, 200)}` }, { status: 502 });
  }
}
