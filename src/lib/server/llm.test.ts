import { describe, expect, it } from "vitest";
import { modelById } from "@/lib/models";
import { forgetOwnLimits, geminiError, modelAvailable } from "@/lib/server/llm";

const own = modelById("own:gemini-3.6-flash")!;

describe("own-key errors", () => {
  it("a refused member key moves the ladder on, for that member only", () => {
    const e = geminiError(own, Object.assign(new Error('{"error":{"code":400,"message":"API key not valid.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}'), { status: 400 }), "u1");
    expect(e.kind).toBe("daily");
    expect(e.message).toContain("내 API 키가 거부되었습니다");
    expect(modelAvailable(own, "u1")).toBe(false);
    // The key is bad for every model, so none of the member's own-key models is tried again today.
    expect(modelAvailable(modelById("own:gemini-3.8-flash")!, "u1")).toBe(false);
    expect(modelAvailable(own, "u2")).toBe(true);
  });

  it("a member's daily quota is theirs alone", () => {
    const m = modelById("own:gemini-3.7-flash")!;
    geminiError(m, Object.assign(new Error("RESOURCE_EXHAUSTED GenerateRequestsPerDayPerProjectPerModel"), { status: 429 }), "u3");
    expect(modelAvailable(m, "u3")).toBe(false);
    expect(modelAvailable(m, "u4")).toBe(true);
  });

  it("a new key starts with a clean slate", () => {
    const m = modelById("own:gemini-3.5-flash")!;
    geminiError(m, Object.assign(new Error("API key not valid"), { status: 400 }), "u5");
    expect(modelAvailable(m, "u5")).toBe(false);
    forgetOwnLimits("u5");
    expect(modelAvailable(m, "u5")).toBe(true);
  });
});
