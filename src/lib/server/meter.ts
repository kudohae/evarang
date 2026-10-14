import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { ACTION_IDS, ACTIONS, quotaMessage, type ActionId } from "@/lib/metering/actions";
import { kstDay, nextKstMidnight } from "@/lib/metering/day";
import { decide } from "@/lib/metering/decide";
import { currentUser } from "@/lib/server/auth";
import { databaseUrl, neonClient } from "@/lib/server/sql";

/*
  The usage ledger: one row per (who, action, reference, Korean day). The same reference is counted once
  a day, so a test's batches, its overall verdict, retries and model switches all count as one evaluation.
  Without a database nothing is counted. If the ledger itself fails, work goes ahead: an outage of the
  ledger should not take the service down with it.
*/

export class MeterError extends Error {
  constructor(
    readonly action: ActionId,
    readonly remaining: number,
    readonly resetAt: string,
  ) {
    super(quotaMessage(action));
  }
}

let schema: Promise<unknown> | null = null;

async function db() {
  const client = neonClient();
  schema ??= (async () => {
    await client`
      CREATE TABLE IF NOT EXISTS usage_events (
        subject  text NOT NULL,
        action   text NOT NULL,
        ref      text NOT NULL,
        day      date NOT NULL,
        units    real NOT NULL,
        at       timestamptz NOT NULL DEFAULT now(),
        UNIQUE (subject, action, ref, day)
      )`;
    await client`CREATE INDEX IF NOT EXISTS usage_events_day ON usage_events (subject, day)`;
    // Requests made under one reference that day, so a reused reference cannot run without end.
    await client`ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS hits int NOT NULL DEFAULT 1`;
  })();
  try {
    await schema;
  } catch (e) {
    schema = null;
    throw e;
  }
  return client;
}

/** Members are counted by account, everyone else by a keyed hash of their IP address (never the address itself). */
async function subject(): Promise<{ id: string; member: boolean }> {
  const user = await currentUser();
  if (user) return { id: `u:${user.id}`, member: true };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.USAGE_SALT || databaseUrl() || "";
  return { id: `ip:${createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32)}`, member: false };
}

export async function meter(action: ActionId, units: number, ref: string): Promise<void> {
  if (!databaseUrl()) return;
  const now = new Date();
  const day = kstDay(now);
  let verdict: { ok: boolean; remaining: number };
  try {
    const who = await subject();
    const client = await db();
    const rows = (await client`
      SELECT COALESCE(SUM(units), 0)::float AS used, BOOL_OR(ref = ${ref}) AS counted,
             COALESCE(MAX(hits) FILTER (WHERE ref = ${ref}), 0)::int AS hits
      FROM usage_events WHERE subject = ${who.id} AND action = ${action} AND day = ${day}`) as { used: number; counted: boolean | null; hits: number }[];
    const free = ACTIONS[action].freePerDay[who.member ? "member" : "anon"];
    const counted = Boolean(rows[0]?.counted);
    verdict = decide(Number(rows[0]?.used ?? 0), units, free, counted, { hits: Number(rows[0]?.hits ?? 0), maxPerRef: ACTIONS[action].maxPerRef });
    // Paid credits will be a branch here: past the free allowance, take from the member's wallet.
    if (verdict.ok) {
      await client`
        INSERT INTO usage_events (subject, action, ref, day, units)
        VALUES (${who.id}, ${action}, ${ref}, ${day}, ${units})
        ON CONFLICT (subject, action, ref, day) DO UPDATE SET hits = usage_events.hits + 1`;
    }
  } catch (e) {
    console.error("usage ledger failed:", e);
    return;
  }
  if (!verdict.ok) throw new MeterError(action, verdict.remaining, nextKstMidnight(now).toISOString());
}

export type UsageSummary = Record<ActionId, { used: number; free: number; remaining: number }>;

export async function usageSummary(): Promise<UsageSummary> {
  const who = databaseUrl() ? await subject() : { id: "", member: false };
  const used = new Map<string, number>();
  if (databaseUrl()) {
    const client = await db();
    const rows = (await client`
      SELECT action, SUM(units)::float AS used FROM usage_events
      WHERE subject = ${who.id} AND day = ${kstDay(new Date())} GROUP BY action`) as { action: string; used: number }[];
    for (const r of rows) used.set(r.action, Number(r.used));
  }
  return Object.fromEntries(
    ACTION_IDS.map((id) => {
      const free = ACTIONS[id].freePerDay[who.member ? "member" : "anon"];
      const u = used.get(id) ?? 0;
      return [id, { used: u, free, remaining: Math.max(0, free - u) }];
    }),
  ) as UsageSummary;
}

/** Rows older than 90 days; called by the daily cron. */
export async function purgeUsage(): Promise<number> {
  if (!databaseUrl()) return 0;
  const client = await db();
  const rows = (await client`DELETE FROM usage_events WHERE day < (now() AT TIME ZONE 'Asia/Seoul')::date - 90 RETURNING 1`) as unknown[];
  return rows.length;
}
