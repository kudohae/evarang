import { describe, expect, it } from "vitest";
import { isUnlimited } from "@/lib/metering/unlimited";

describe("isUnlimited", () => {
  it("matches listed emails regardless of case and spacing", () => {
    const list = " Someone@Example.com , other@example.com\nthird@example.com";
    expect(isUnlimited("someone@example.com", list)).toBe(true);
    expect(isUnlimited("OTHER@example.com", list)).toBe(true);
    expect(isUnlimited("third@example.com", list)).toBe(true);
    expect(isUnlimited("nobody@example.com", list)).toBe(false);
  });

  it("nobody is unlimited without a list or an email", () => {
    expect(isUnlimited("someone@example.com", undefined)).toBe(false);
    expect(isUnlimited("someone@example.com", "")).toBe(false);
    expect(isUnlimited(undefined, "someone@example.com")).toBe(false);
    expect(isUnlimited("", " , ")).toBe(false);
  });
});
