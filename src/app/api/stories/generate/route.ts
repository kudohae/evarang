import { guard } from "@/lib/server/access";
import { apiError } from "@/lib/server/api-error";
import { authConfigured, currentUser } from "@/lib/server/auth";
import { modelAccess } from "@/lib/server/feedback-request";
import { generate, LlmError } from "@/lib/server/llm";
import { meter, MeterError } from "@/lib/server/meter";
import { storySystemPrompt, storyUserPrompt } from "@/lib/stories/prompt";
import { StoryRequestSchema, StorySchema } from "@/lib/stories/schema";

export const maxDuration = 120;

/** 스토리뱅크: one personal experience → a reusable English story. Members only. */
export async function POST(request: Request) {
  const denied = await guard();
  if (denied) return denied;
  if (authConfigured() && !(await currentUser().catch(() => null))) return apiError(401, "스토리 만들기는 로그인한 회원만 쓸 수 있습니다.", { kind: "auth" });
  const parsed = StoryRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "요청 형식이 올바르지 않습니다.", { kind: "invalid" });
  const access = await modelAccess(parsed.data.model);
  if (access instanceof Response) return access;
  if (!access.model.own) {
    try {
      await meter("story.generate", 1, parsed.data.ref);
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
      system: storySystemPrompt(),
      user: storyUserPrompt(parsed.data),
      schema: StorySchema,
    });
    return Response.json({ story: data, usage });
  } catch (e) {
    if (e instanceof LlmError) return apiError(e.status, e.message, { kind: e.kind, retryAfter: e.retryAfter });
    throw e;
  }
}
