import { guard } from "@/lib/server/access";
import { apiError } from "@/lib/server/api-error";
import { modelAccess } from "@/lib/server/feedback-request";
import { generate, LlmError } from "@/lib/server/llm";
import { meter, MeterError } from "@/lib/server/meter";
import { StructureFeedbackSchema, StructureRequestSchema, structureSystemPrompt, structureUserPrompt } from "@/lib/feedback/structure";

export const maxDuration = 120;

/** 문장 구조화 연습: the four recorded parts of one answer, judged together. Counts as one answer's feedback. */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = StructureRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "요청 형식이 올바르지 않습니다.", { kind: "invalid" });
  const access = await modelAccess(parsed.data.model);
  if (access instanceof Response) return access;
  if (!access.model.own) {
    try {
      await meter("feedback.answer", 1, parsed.data.ref);
    } catch (e) {
      if (e instanceof MeterError) return apiError(429, e.message, { kind: "quota", remaining: e.remaining, resetAt: e.resetAt });
      throw e;
    }
  }
  try {
    const { data, usage } = await generate({
      model: access.model,
      apiKey: access.apiKey,
      owner: access.owner,
      system: structureSystemPrompt(),
      user: structureUserPrompt(parsed.data),
      schema: StructureFeedbackSchema,
    });
    return Response.json({ feedback: data, usage });
  } catch (e) {
    if (e instanceof LlmError) return apiError(e.status, e.message, { kind: e.kind, retryAfter: e.retryAfter });
    throw e;
  }
}
