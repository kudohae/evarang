import { describe, expect, it } from "vitest";
import { z } from "zod";
import { StoryRequestSchema, StorySchema } from "@/lib/stories/schema";

const good = {
  title: "제주도 가족 여행",
  story: "Last summer I went to Jeju with my family. ".repeat(10),
  outline: [
    { part: "opening", text: "Last summer I went to Jeju with my family." },
    { part: "closing", text: "It was the best trip I've ever had." },
  ],
  reusable_for: ["domestic_travel", "home"],
  expressions: [{ en: "It was a blast.", ko: "정말 즐거웠다." }],
  tips: ["과거 시제를 끝까지 유지하세요."],
};

describe("StorySchema", () => {
  it("accepts a well-formed story", () => {
    expect(StorySchema.safeParse(good).success).toBe(true);
  });

  it("only knows the question bank's topics", () => {
    expect(StorySchema.safeParse({ ...good, reusable_for: ["moon_trip"] }).success).toBe(false);
    const json = JSON.stringify(z.toJSONSchema(StorySchema));
    expect(json).toContain('"enum"');
    expect(json).toContain("domestic_travel");
  });

  it("rejects an unknown outline part", () => {
    expect(StorySchema.safeParse({ ...good, outline: [{ part: "middle", text: "x" }] }).success).toBe(false);
  });
});

describe("StoryRequestSchema", () => {
  it("needs one to three topics, a memo and a target grade", () => {
    const req = { model: "gemini-3.8-flash", ref: "story-1", topicIds: ["home"], memo: "작년에 이사했다", level: "IM3" };
    expect(StoryRequestSchema.safeParse(req).success).toBe(true);
    expect(StoryRequestSchema.safeParse({ ...req, topicIds: [] }).success).toBe(false);
    expect(StoryRequestSchema.safeParse({ ...req, topicIds: ["a", "b", "c", "d"] }).success).toBe(false);
    expect(StoryRequestSchema.safeParse({ ...req, memo: " " }).success).toBe(false);
    expect(StoryRequestSchema.safeParse({ ...req, memo: "가".repeat(2001) }).success).toBe(false);
    expect(StoryRequestSchema.safeParse({ ...req, level: "NL" }).success).toBe(false);
  });
});
