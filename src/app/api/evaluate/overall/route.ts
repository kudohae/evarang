import { guard } from "@/lib/server/access";
import { readEvalRequest } from "@/lib/server/eval-request";
import { generate, LlmError } from "@/lib/server/llm";
import { OverallSchema } from "@/lib/evaluation/schema";
import { overallSystemPrompt, overallUserPrompt } from "@/lib/evaluation/prompts";

export const maxDuration = 300;

export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  const req = await readEvalRequest(request);
  if (req instanceof Response) return req;
  try {
    const { data, usage } = await generate({
      model: req.model,
      system: overallSystemPrompt(),
      user: overallUserPrompt(req.context),
      schema: OverallSchema,
      effort: "high",
    });
    return Response.json({ overall: data, usage });
  } catch (e) {
    if (e instanceof LlmError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
