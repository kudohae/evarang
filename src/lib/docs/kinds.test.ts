import { describe, expect, it } from "vitest";
import { KINDS } from "@/lib/docs/kinds";

describe("kinds", () => {
  it("practice sessions and stories name their recordings", () => {
    const session = { attempts: [{ recording: { audioKey: "s1:1" } }, {}, { recording: { audioKey: "s1:3" } }] };
    expect(KINDS.session.audioKeys(session)).toEqual(["1", "3"]);
    expect(KINDS.story.audioKeys({ practice: [{ recording: { audioKey: "st1:2" } }] })).toEqual(["2"]);
    expect(KINDS.session.audioKeys(null)).toEqual([]);
    expect(KINDS.session.summary({ kind: "drill", title: "과거 경험", createdAt: 5, attempts: [1, 2] })).toMatchObject({ title: "과거 경험", attemptCount: 2 });
    expect(KINDS.story.summary({ title: "제주 여행", createdAt: 7 })).toMatchObject({ title: "제주 여행", createdAt: 7 });
    expect(KINDS.note.maxBytes).toBeGreaterThanOrEqual(200_000);
    // Each story practice carries a timed transcript and full feedback; a few dozen must fit.
    expect(KINDS.story.maxBytes).toBeGreaterThanOrEqual(900_000);
  });
});
