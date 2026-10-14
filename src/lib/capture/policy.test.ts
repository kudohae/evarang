import { describe, expect, it } from "vitest";
import { EXAM_POLICY, PRACTICE_POLICY, replayState } from "@/lib/capture/policy";

describe("replayState", () => {
  it("exam replay rule", () => {
    expect(replayState(EXAM_POLICY, { replays: 0, answeringSince: 0, now: 4000 })).toEqual({ allowed: true, secondsLeft: 1 });
    expect(replayState(EXAM_POLICY, { replays: 0, answeringSince: 0, now: 0 })).toEqual({ allowed: true, secondsLeft: 5 });
    expect(replayState(EXAM_POLICY, { replays: 0, answeringSince: 0, now: 5000 }).allowed).toBe(false);
    expect(replayState(EXAM_POLICY, { replays: 0, answeringSince: 0, now: 5001 }).allowed).toBe(false);
    expect(replayState(EXAM_POLICY, { replays: 1, answeringSince: 0, now: 1000 }).allowed).toBe(false);
  });

  it("practice replays are unlimited", () => {
    expect(replayState(PRACTICE_POLICY, { replays: 0, answeringSince: 0, now: 999_999 })).toEqual({ allowed: true, secondsLeft: null });
    expect(replayState(PRACTICE_POLICY, { replays: 7, answeringSince: 0, now: 1 })).toEqual({ allowed: true, secondsLeft: null });
  });
});
