import { z } from "zod";
import { TOPICS } from "@/lib/content/topics";
import type { Attempt } from "@/lib/domain/attempt";

/* 스토리뱅크: a personal experience written once as an English story that can answer many questions. */

const TOPIC_IDS = TOPICS.map((t) => t.id) as [string, ...string[]];
const Topic = z.enum(TOPIC_IDS);

export const STORY_LEVELS = ["IM2", "IM3", "IH", "AL"] as const;
export type StoryLevel = (typeof STORY_LEVELS)[number];

export const StorySchema = z.object({
  title: z.string().describe("이야기의 짧은 제목. 한국어."),
  story: z.string().describe("1인칭 과거 시제 영어 이야기. 120~200단어. 말하듯 자연스럽게, 목표 등급에 맞게."),
  outline: z
    .array(z.object({ part: z.enum(["opening", "reason", "example", "closing"]), text: z.string().describe("이야기에서 그 부분에 해당하는 영어 문장") }))
    .describe("바로 답하기 → 이유 → 예시·경험 → 생각·감정 순서의 뼈대"),
  reusable_for: z.array(Topic).describe("이 이야기를 조금 바꿔 답할 수 있는 주제 id. 입력한 주제를 포함해 3~6개."),
  expressions: z.array(z.object({ en: z.string(), ko: z.string() })).describe("이야기에서 외워 둘 만한 표현 4~6개와 한국어 뜻"),
  tips: z.array(z.string()).describe("이 이야기를 다른 질문에 돌려 쓰는 요령. 한국어, 2~3개."),
});

export type StoryContent = z.infer<typeof StorySchema>;

export const StoryRequestSchema = z.object({
  model: z.string(),
  /** Usage reference: one id per creation request, so a ladder retry is counted once. */
  ref: z.string().min(1).max(100),
  topicIds: z.array(Topic).min(1).max(3),
  memo: z.string().trim().min(1).max(2000),
  level: z.enum(STORY_LEVELS),
});

export type StoryRequest = z.infer<typeof StoryRequestSchema>;

/** A story as kept in the story bank (the "story" document). */
export type StoryDoc = StoryContent & {
  id: string;
  createdAt: number;
  topicIds: string[];
  memo: string;
  level: StoryLevel;
  modelId: string;
  /** Speaking practice with this story, newest last. Recordings are `${id}:${n}`. */
  practice: Attempt[];
};
