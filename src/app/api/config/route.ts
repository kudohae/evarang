import { accessRequired, hasAccess } from "@/lib/server/access";
import { providerConfigured } from "@/lib/server/llm";
import { MODELS } from "@/lib/models";
import { storageConfigured } from "@/lib/server/store";

export async function GET() {
  const ok = await hasAccess();
  return Response.json({
    accessRequired: accessRequired(),
    hasAccess: ok,
    research: storageConfigured(),
    stt: Boolean(process.env.ASSEMBLYAI_API_KEY || process.env.GEMINI_API_KEY),
    models: MODELS.map((m) => ({ id: m.id, available: providerConfigured(m.provider) })),
  });
}
