import { describe, expect, it } from "vitest";
import { decide } from "@/lib/metering/decide";

describe("decide", () => {
  it("same reference counts once", () => {
    expect(decide(2, 1, 2, true)).toEqual({ ok: true, remaining: 0 });
    expect(decide(2, 1, 2, false)).toEqual({ ok: false, remaining: 0 });
    expect(decide(0, 3, 10, false)).toEqual({ ok: true, remaining: 7 });
    expect(decide(1, 1, 2, false)).toEqual({ ok: true, remaining: 0 });
    expect(decide(0, 1, 0, false).ok).toBe(false);
    expect(decide(0, 1, 0, true).ok).toBe(false);
  });
});
