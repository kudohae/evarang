import { describe, expect, it } from "vitest";
import { checkDocAddress, isStale } from "@/lib/server/docs";

describe("account documents", () => {
  it("stale writes are rejected", () => {
    expect(isStale(5, 10)).toBe(true);
    expect(isStale(10, 10)).toBe(false);
    expect(isStale(11, 10)).toBe(false);
    expect(isStale(5, null)).toBe(false);
  });

  it("only known kinds and well-formed ids and keys pass", () => {
    expect(() => checkDocAddress("exam", "mabc123xyz")).not.toThrow();
    expect(() => checkDocAddress("session", "s_1-aB9z", "1")).not.toThrow();
    expect(() => checkDocAddress("secret", "mabc123xyz")).toThrow();
    expect(() => checkDocAddress("exam", "../../x")).toThrow();
    expect(() => checkDocAddress("exam", "short")).toThrow();
    expect(() => checkDocAddress("exam", "mabc123xyz", "../a")).toThrow();
    expect(() => checkDocAddress("note", "mabc123xyz", "1")).toThrow();
  });
});
