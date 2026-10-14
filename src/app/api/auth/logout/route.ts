import { handle, signOut } from "@/lib/server/auth";

export async function POST() {
  return handle(async () => {
    await signOut();
    return Response.json({ ok: true });
  });
}
