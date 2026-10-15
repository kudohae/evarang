import { describe, expect, it } from "vitest";
import { topicById } from "@/lib/content/topics";
import { practiceQuestion, PRACTICE_TYPES } from "@/lib/practice/questions";

describe("practiceQuestion", () => {
  it("a type alone picks a topic that has that type", () => {
    for (const type of PRACTICE_TYPES) {
      const q = practiceQuestion({ type });
      expect(q.type).toBe(type);
      expect(q.text.length).toBeGreaterThan(10);
      const t = topicById(q.topicId)!;
      if (type.startsWith("rp_")) expect(t.roleplay).toBeDefined();
    }
  });

  it("a topic alone stays on that topic", () => {
    const q = practiceQuestion({ topicId: "home" });
    expect(q.topicId).toBe("home");
    expect(q.topicLabel).toBe("거주지");
  });

  it("does not repeat the previous question when there is another", () => {
    const first = practiceQuestion({ type: "describe", topicId: "home" });
    for (let i = 0; i < 10; i++) expect(practiceQuestion({ type: "describe", topicId: "home", avoid: first.text }).text).not.toBe(first.text);
  });

  it("unknown topics fall back to any topic", () => {
    expect(practiceQuestion({ topicId: "nope", type: "past" }).type).toBe("past");
  });
});
