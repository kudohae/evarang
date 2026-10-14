import { guard } from "@/lib/server/access";
import { handle, requireUser } from "@/lib/server/auth";
import { listDocs } from "@/lib/server/docs";

/** Summaries and deletion marks of one kind: GET /api/me/docs?kind=exam */
export async function GET(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const kind = new URL(request.url).searchParams.get("kind") ?? "";
  return handle(async () => Response.json({ docs: await listDocs(await requireUser(), kind) }), { read: true });
}
