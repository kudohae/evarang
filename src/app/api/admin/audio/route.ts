import { get } from "@vercel/blob";
import { adminGuard } from "@/lib/server/access";
import { withStore } from "@/lib/server/store";

/** Streams a private recording to a signed-in admin. */
export async function GET(request: Request) {
  const denied = await adminGuard();
  if (denied) return denied;
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (!/^exams\/[a-z0-9]+\/\d+\.(webm|m4a|ogg)$/.test(path)) return new Response("bad path", { status: 400 });
  return withStore(async () => {
    const blob = await get(path, { access: "private" });
    if (!blob || blob.statusCode !== 200) return new Response("not found", { status: 404 });
    return new Response(blob.stream, { headers: { "content-type": blob.blob.contentType, "cache-control": "private, no-store" } });
  });
}
