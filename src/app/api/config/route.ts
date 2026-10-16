import { accessRequired, hasAccess } from "@/lib/server/access";
import { modelAvailable } from "@/lib/server/llm";
import { MODELS, OWN_MODELS } from "@/lib/models";
import { aiKeysConfigured, keySummary, type KeySummary } from "@/lib/server/ai-keys";
import { storageConfigured } from "@/lib/server/store";
import { authConfigured, currentUser, type User } from "@/lib/server/auth";

export async function GET() {
  const auth = authConfigured();
  let user: User | null = null;
  let aiKey: KeySummary | null = null;
  try {
    user = await currentUser();
  } catch {
    // The database being down should not take the whole site with it; the visitor just looks signed out.
  }
  // With accounts, the site is for signed-in members (see guard); without, behind the access code if set.
  const ok = auth ? Boolean(user) : await hasAccess();
  try {
    aiKey = user ? await keySummary(user.id) : null;
  } catch {
    // Without the key record the member grades on the site's free models, as if they had no key.
  }
  return Response.json({
    accessRequired: auth || accessRequired(),
    hasAccess: ok,
    /** Sign-up asks for the invite code (ACCESS_CODE). */
    inviteRequired: auth && accessRequired(),
    research: storageConfigured(),
    auth,
    user: user && {
      email: user.email,
      nickname: user.nickname,
      createdAt: user.createdAt,
      recordsConsent: user.recordsConsent,
      aiKey: aiKey && { provider: aiKey.provider, hint: aiKey.hint },
    },
    /** Members can bring their own AI key. */
    aiKeys: aiKeysConfigured(),
    // Which half of the storage setup is missing, for diagnosing a hidden research consent box. Names only, no values.
    storage: {
      database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      blob: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
    },
    stt: Boolean(process.env.ASSEMBLYAI_API_KEY || process.env.GEMINI_API_KEY),
    // A member's own-key models first (only with a key of that service), then the site's free models.
    models: [
      ...OWN_MODELS.map((m) => ({ id: m.id, available: Boolean(user && aiKey?.provider === m.provider && modelAvailable(m, user.id)) })),
      ...MODELS.map((m) => ({ id: m.id, available: modelAvailable(m) })),
    ],
  });
}
