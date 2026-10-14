import { describe, expect, it } from "vitest";
import { kstDay, nextKstMidnight } from "@/lib/metering/day";

describe("kst day", () => {
  it("kst day boundary", () => {
    expect(kstDay(new Date("2026-10-14T14:59:59Z"))).toBe("2026-10-14");
    expect(kstDay(new Date("2026-10-14T15:00:00Z"))).toBe("2026-10-15");
    // 00:30 KST is still the previous day in UTC.
    expect(kstDay(new Date("2026-10-13T15:30:00Z"))).toBe("2026-10-14");
    expect(nextKstMidnight(new Date("2026-10-14T03:00:00Z")).toISOString()).toBe("2026-10-14T15:00:00.000Z");
    expect(nextKstMidnight(new Date("2026-10-14T15:00:00Z")).toISOString()).toBe("2026-10-15T15:00:00.000Z");
    expect(nextKstMidnight(new Date("2026-12-31T16:00:00Z")).toISOString()).toBe("2027-01-01T15:00:00.000Z");
  });
});
