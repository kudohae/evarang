import { describe, expect, it } from "vitest";
import { baseModelId, isOwnModel, modelById, modelLabel, OWN_MODELS } from "@/lib/models";

describe("own-key models", () => {
  it("mirror the Gemini models under an own: id", () => {
    expect(OWN_MODELS.map((m) => m.id)).toEqual([
      "own:gemini-3.8-flash",
      "own:gemini-3.7-flash",
      "own:gemini-3.6-flash",
      "own:gemini-3.5-flash",
      "own:gemini-3.5-flash-lite",
    ]);
    expect(modelById("own:gemini-3.8-flash")).toMatchObject({ provider: "gemini", own: true });
    expect(modelById("gemini-3.8-flash")?.own).toBeFalsy();
    expect(modelById("own:groq-gpt-oss")).toBeUndefined();
  });

  it("name and unwrap", () => {
    expect(modelLabel("own:gemini-3.8-flash")).toBe("Gemini 3.8 Flash · 내 키");
    expect(isOwnModel("own:gemini-3.8-flash")).toBe(true);
    expect(isOwnModel("gemini-3.8-flash")).toBe(false);
    expect(baseModelId("own:gemini-3.5-flash")).toBe("gemini-3.5-flash");
    expect(baseModelId("gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });
});
