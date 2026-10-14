import { accessRequired, hasAccess } from "@/lib/server/access";
import { modelAvailable } from "@/lib/server/llm";
import { MODELS } from "@/lib/models";
import { storageConfigured } from "@/lib/server/store";
import { authConfigured, currentUser, type User } from "@/lib/server/auth";

export async function GET() {
  const ok = await hasAccess();
  let user: User | null = null;
  try {
    user = ok ? await currentUser() : null;
  } catch {
    // The database being down should not take the whole site with it; the visitor just looks signed out.
  }
  return Response.json({
    accessRequired: accessRequired(),
    hasAccess: ok,
    research: storageConfigured(),
    auth: authConfigured(),
    user: user && { email: user.email, nickname: user.nickname, createdAt: user.createdAt, recordsConsent: user.recordsConsent },
    // Which half of the storage setup is missing, for diagnosing a hidden research consent box. Names only, no values.
    storage: {
      database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      blob: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
    },
    stt: Boolean(process.env.ASSEMBLYAI_API_KEY || process.env.GEMINI_API_KEY),
    models: MODELS.map((m) => ({ id: m.id, available: modelAvailable(m) })),
  });
}
