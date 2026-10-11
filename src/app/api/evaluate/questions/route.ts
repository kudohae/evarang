import { guard } from "@/lib/server/access";
import { readEvalRequest } from "@/lib/server/eval-request";
import { generate, LlmError } from "@/lib/server/llm";
import { QuestionBatchSchema } from "@/lib/evaluation/schema";
import { questionSystemPrompt, questionUserPrompt } from "@/lib/evaluation/prompts";

export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const req = await readEvalRequest(request);
  if (req instanceof Response) return req;
  try {
    const { data, usage } = await generate({
      model: req.model,
      system: questionSystemPrompt(),
      user: questionUserPrompt(req.context),
      schema: QuestionBatchSchema,
    });
    return Response.json({ items: data.items, usage });
  } catch (e) {
    if (e instanceof LlmError) return Response.json({ error: e.message, kind: e.kind, retryAfter: e.retryAfter }, { status: e.status });
    throw e;
  }
}
