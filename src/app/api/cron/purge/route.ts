import { purgeExpired, storageConfigured, withStore } from "@/lib/server/store";

/** Daily job (vercel.json): deletes records and recordings older than the retention period. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!storageConfigured()) return Response.json({ ok: true, purged: 0, note: "storage not configured" });
  return withStore(async () => Response.json({ ok: true, purged: await purgeExpired() }));
}
