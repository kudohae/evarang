import { describe, expect, it } from "vitest";
import { SKILL_IDS } from "@/lib/domain/skills";
import { LENSES, lensForType } from "@/lib/feedback/lenses";

describe("lenses", () => {
  it("every lens points at real skills", () => {
    const lenses = Object.values(LENSES);
    expect(lenses).toHaveLength(16);
    for (const lens of lenses) {
      expect(lens.focus.length).toBeGreaterThan(0);
      for (const s of lens.focus) expect(SKILL_IDS).toContain(s);
      expect(lens.instructions.trim()).not.toBe("");
    }
    for (const [id, lens] of Object.entries(LENSES)) expect(lens.id).toBe(id);
    expect(LENSES["type.past"].focus).toContain("tense.past");
    expect(lenses.filter((l) => l.id.startsWith("structure.")).every((l) => l.weight === "light")).toBe(true);
    expect(LENSES.exam.weight).toBe("full");
    expect(lensForType("rp_ask")).toBe("type.rp_ask");
  });
});
