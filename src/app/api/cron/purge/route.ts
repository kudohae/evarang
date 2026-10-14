import { purgeUsage } from "@/lib/server/meter";
import { purgeExpired, storageConfigured, withStore } from "@/lib/server/store";

/** Daily job (vercel.json): deletes research records and recordings past retention, and usage rows older than 90 days. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let usage = 0;
  try {
    usage = await purgeUsage();
  } catch (e) {
    console.error("usage purge failed:", e);
  }
  if (!storageConfigured()) return Response.json({ ok: true, purged: 0, usage, note: "storage not configured" });
  return withStore(async () => Response.json({ ok: true, purged: await purgeExpired(), usage }));
}
