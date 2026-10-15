import type { AiProviderId } from "@/lib/ai-providers";
import { guard } from "@/lib/server/access";
import { checkKeyInput, keySummary, removeKey, storeKey, verifyKey } from "@/lib/server/ai-keys";
import { handle, limit, requireUser } from "@/lib/server/auth";
import { forgetOwnLimits } from "@/lib/server/llm";

/** The member's AI key: which service and its last four characters. The key itself never comes back. */
export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => Response.json({ key: await keySummary((await requireUser()).id) }), { read: true });
}

/** Body `{ provider, key }`. The key is checked with the provider before it is saved. */
export async function PUT(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const provider = String(body.provider ?? "") as AiProviderId;
    const key = checkKeyInput(body.key);
    await limit(`ai-key:${user.id}`, 10, 15);
    await verifyKey(provider, key);
    await storeKey(user.id, provider, key);
    forgetOwnLimits(user.id);
    return Response.json({ key: await keySummary(user.id) });
  });
}

export async function DELETE() {
  const denied = await guard();
  if (denied) return denied;
  return handle(async () => {
    const user = await requireUser();
    await removeKey(user);
    forgetOwnLimits(user.id);
    return Response.json({ ok: true });
  });
}
