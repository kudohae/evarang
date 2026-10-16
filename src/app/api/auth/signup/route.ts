import { inviteOk } from "@/lib/server/access";
import type { AiProviderId } from "@/lib/ai-providers";
import { aiKeysConfigured, checkKeyInput, storeKey, verifyKey } from "@/lib/server/ai-keys";
import { AuthError, handle, signUp } from "@/lib/server/auth";

export async function POST(request: Request) {
  return handle(async () => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (!inviteOk(body.invite)) throw new AuthError("초대 코드가 맞지 않습니다.", 403);
    if (body.agree !== true || body.age !== true) throw new AuthError("필수 항목에 동의해야 가입할 수 있습니다.");
    // The AI key is optional; when given, it must work before the account is made.
    const wantsKey = aiKeysConfigured() && typeof body.aiKey === "string" && body.aiKey.trim() !== "";
    const provider = String(body.aiProvider ?? "gemini") as AiProviderId;
    const key = wantsKey ? checkKeyInput(body.aiKey) : "";
    await signUp(
      { email: String(body.email ?? ""), password: String(body.password ?? ""), nickname: String(body.nickname ?? "") },
      wantsKey ? { beforeCreate: () => verifyKey(provider, key), afterCreate: (id) => storeKey(id, provider, key) } : {},
    );
    return Response.json({ ok: true });
  });
}
