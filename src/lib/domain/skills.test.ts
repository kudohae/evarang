import { describe, expect, it } from "vitest";
import { SKILL_IDS, SKILLS, skillById } from "@/lib/domain/skills";

describe("skills", () => {
  it("are unique and complete", () => {
    expect(SKILL_IDS.length).toBe(21);
    expect(new Set(SKILL_IDS).size).toBe(21);
    for (const id of SKILL_IDS) expect(id).toMatch(/^[a-z]+\.[a-z_]+$/);
    expect(SKILLS.map((s) => s.id)).toEqual([...SKILL_IDS]);
    for (const s of SKILLS) {
      expect(s.definition.length).toBeGreaterThan(10);
      expect(s.id.startsWith(`${s.group}.`)).toBe(true);
    }
    expect(skillById("tense.past")?.label).toBe("과거 시제");
    expect(skillById("made.up")).toBeUndefined();
  });
});
