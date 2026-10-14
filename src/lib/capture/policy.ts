/*
  How an answer is taken. The mock test follows the real OPIc: the question is heard, never shown, and can be
  heard once more only within five seconds after it ends; there is no second take. Practice relaxes all three.
*/

export type CapturePolicy = {
  /** `windowMs`: how long after the question ends a replay is offered; null for no limit. */
  replay: { limit: number; windowMs: number | null };
  /** A button that shows the question text. */
  showText: boolean;
  /** A button that throws away the answer so far and records again. */
  allowRetry: boolean;
};

export const EXAM_POLICY: CapturePolicy = { replay: { limit: 1, windowMs: 5000 }, showText: false, allowRetry: false };

export const PRACTICE_POLICY: CapturePolicy = { replay: { limit: Infinity, windowMs: null }, showText: true, allowRetry: true };

/** Whether a replay is offered now; `answeringSince` is when the question finished and recording began. */
export function replayState(policy: CapturePolicy, s: { replays: number; answeringSince: number; now: number }): { allowed: boolean; secondsLeft: number | null } {
  if (s.replays >= policy.replay.limit) return { allowed: false, secondsLeft: policy.replay.windowMs === null ? null : 0 };
  if (policy.replay.windowMs === null) return { allowed: true, secondsLeft: null };
  const leftMs = s.answeringSince + policy.replay.windowMs - s.now;
  const secondsLeft = Math.min(policy.replay.windowMs / 1000, Math.max(0, Math.ceil(leftMs / 1000)));
  return { allowed: leftMs > 0, secondsLeft };
}
