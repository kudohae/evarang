import { accessRequired, hasAccess } from "@/lib/server/access";
import { modelAvailable } from "@/lib/server/llm";
import { MODELS } from "@/lib/models";
import { storageConfigured } from "@/lib/server/store";

export async function GET() {
  const ok = await hasAccess();
  return Response.json({
    accessRequired: accessRequired(),
    hasAccess: ok,
    research: storageConfigured(),
    // Which half of the storage setup is missing, for diagnosing a hidden research consent box. Names only, no values.
    storage: {
      database: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL),
      blob: Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN),
    },
    stt: Boolean(process.env.ASSEMBLYAI_API_KEY || process.env.GEMINI_API_KEY),
    models: MODELS.map((m) => ({ id: m.id, available: modelAvailable(m) })),
  });
}
