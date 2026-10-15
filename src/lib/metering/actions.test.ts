import { describe, expect, it } from "vitest";
import { ACTIONS } from "@/lib/metering/actions";
import { MODELS, OWN_MODELS } from "@/lib/models";

describe("ACTIONS", () => {
  it("one request's ladder fits its per-reference cap", () => {
    // Every model of the ladder may be tried once for the same reference before one answers.
    const ladder = MODELS.length + OWN_MODELS.length;
    for (const id of ["exam.evaluate", "feedback.answer", "feedback.light", "story.generate"] as const) expect(ACTIONS[id].maxPerRef).toBeGreaterThanOrEqual(ladder);
  });
});
