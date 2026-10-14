import { z } from "zod";
import { LENSES, type Lens, type LensId } from "@/lib/feedback/lenses";
import type { EvalContext } from "@/lib/feedback/prompt";
import { modelById, type ModelOption } from "@/lib/models";
import type { ActionId } from "@/lib/metering/actions";
import { apiError } from "@/lib/server/api-error";
import { meter, MeterError } from "@/lib/server/meter";

const Body = z.object({
  model: z.string(),
  lens: z.string().optional(),
  /** What the work is for, for the usage ledger: the exam id for mock tests, the attempt id for practice. */
  ref: z.string().min(1).max(100),
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

export type FeedbackRequest = { model: ModelOption; lens: Lens; ref: string; context: EvalContext };

/** `maxItems`: answers come in batches of up to 8; the overall verdict reads the whole test. */
export async function readFeedbackRequest(request: Request, maxItems: number): Promise<FeedbackRequest | Response> {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.context.items.length > maxItems) return apiError(400, "요청 형식이 올바르지 않습니다.", { kind: "invalid" });
  const model = modelById(parsed.data.model);
  if (!model) return apiError(400, "알 수 없는 평가 모델입니다.", { kind: "invalid" });
  const lensId = (parsed.data.lens ?? "exam") as LensId;
  const lens = Object.hasOwn(LENSES, lensId) ? LENSES[lensId] : undefined;
  if (!lens) return apiError(400, "알 수 없는 피드백 종류입니다.", { kind: "invalid" });
  return { model, lens, ref: parsed.data.ref, context: parsed.data.context as unknown as EvalContext };
}

/** Mock-test grading counts once per test; other feedback counts per answer. */
function actionFor(req: FeedbackRequest): { action: ActionId; units: number } {
  if (req.lens.id === "exam") return { action: "exam.evaluate", units: 1 };
  return { action: req.lens.weight === "light" ? "feedback.light" : "feedback.answer", units: req.context.items.length };
}

/** Counts the request against today's free allowance; a Response when it is spent. */
export async function meterFeedback(req: FeedbackRequest): Promise<Response | null> {
  const { action, units } = actionFor(req);
  try {
    await meter(action, units, req.ref);
    return null;
  } catch (e) {
    if (e instanceof MeterError) return apiError(429, e.message, { kind: "quota", remaining: e.remaining, resetAt: e.resetAt });
    throw e;
  }
}
