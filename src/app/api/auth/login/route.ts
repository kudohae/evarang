import { handle, signIn } from "@/lib/server/auth";

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    await signIn({ email: String(body.email ?? ""), password: String(body.password ?? "") });
    return Response.json({ ok: true });
  });
}
