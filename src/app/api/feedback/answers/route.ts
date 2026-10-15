import { guard } from "@/lib/server/access";
import { apiError } from "@/lib/server/api-error";
import { meterFeedback, readFeedbackRequest } from "@/lib/server/feedback-request";
import { generate, LlmError } from "@/lib/server/llm";
import { AnswerBatchSchema } from "@/lib/feedback/schema";
import { answersSystemPrompt, answersUserPrompt } from "@/lib/feedback/prompt";

export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const req = await readFeedbackRequest(request, 8);
  if (req instanceof Response) return req;
  const spent = await meterFeedback(req);
  if (spent) return spent;
  try {
    const { data, usage } = await generate({
      model: req.model,
      system: answersSystemPrompt(req.lens),
      user: answersUserPrompt(req.context),
      apiKey: req.apiKey,
      owner: req.owner,
      schema: AnswerBatchSchema,
    });
    return Response.json({ items: data.items, usage });
  } catch (e) {
    if (e instanceof LlmError) return apiError(e.status, e.message, { kind: e.kind, retryAfter: e.retryAfter });
    throw e;
  }
}
