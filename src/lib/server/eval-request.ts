import { z } from "zod";
import { modelById, type ModelOption } from "@/lib/models";
import type { EvalContext } from "@/lib/evaluation/prompts";

const Body = z.object({
  model: z.string(),
  context: z.object({
    startLevel: z.number().int().min(1).max(6),
    finalLevel: z.number().int().min(1).max(6),
    items: z
      .array(
        z.object({
          question: z.object({
            number: z.number(),
            topicId: z.string(),
            topicLabel: z.string(),
            type: z.string(),
            text: z.string(),
            scored: z.boolean(),
          }),
          transcript: z.string().max(20000),
          metrics: z.any(),
        }),
      )
      .min(1)
      .max(15),
  }),
});

export async function readEvalRequest(request: Request): Promise<{ model: ModelOption; context: EvalContext } | Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  const model = modelById(parsed.data.model);
  if (!model) return Response.json({ error: "알 수 없는 평가 모델입니다." }, { status: 400 });
  return { model, context: parsed.data.context as unknown as EvalContext };
}
