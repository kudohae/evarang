import { apiError } from "@/lib/server/api-error";
import { usageSummary } from "@/lib/server/meter";

/** What is left of today's free allowance, per action, for whoever is asking. */
export async function GET() {
  try {
    return Response.json({ usage: await usageSummary() });
  } catch (e) {
    console.error("usage summary failed:", e);
    return apiError(502, "잠시 후 다시 시도하세요. 서버에서 오류가 났습니다.");
  }
}
