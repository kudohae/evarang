import { describe, expect, it } from "vitest";
import { mergeReviewState } from "@/lib/notes/review";

describe("mergeReviewState", () => {
  it("keeps every card's most-reviewed state from either device", () => {
    const a = { x: { box: 3, due: 10, reviews: 4 }, y: { box: 1, due: 5, reviews: 1 } };
    const b = { y: { box: 2, due: 9, reviews: 2 }, z: { box: 2, due: 7, reviews: 1, hidden: true } };
    expect(mergeReviewState(a, b)).toEqual({ x: a.x, y: b.y, z: b.z });
  });

  it("on equal reviews the later due date wins", () => {
    expect(mergeReviewState({ x: { box: 2, due: 5, reviews: 2 } }, { x: { box: 1, due: 8, reviews: 2 } }).x.due).toBe(8);
  });
});
