import { TOPICS, topicById } from "@/lib/content/topics";
import type { StoryRequest } from "@/lib/stories/schema";

const TOPIC_LIST = TOPICS.map((t) => `- ${t.id}: ${t.label}`).join("\n");

export function storySystemPrompt(): string {
  return `You help Korean learners prepare for the OPIc English speaking test by turning one real personal experience into a reusable spoken story.

Rules:
- Write the story in English, first person, past tense, as natural spoken English (contractions, simple connectors), not written prose. 120–200 words, about 60–90 seconds of speech.
- Keep the learner's own facts. Do not invent major events; you may add small concrete details (time, place, a feeling) that make it vivid.
- Pitch the language at the target grade: IM2 = clear simple sentences; IM3 = connected sentences with some detail; IH = paragraph-length narration with varied connectors; AL = rich, well-organised narration with a reflection.
- Follow the answer skeleton: answer first (opening), a reason, a specific example or episode, a closing thought or feeling. "outline" quotes the story's own sentences for each part.
- "reusable_for": topic ids from the list below where this story could answer a question with small changes. Include the topics the learner chose. 3–6 ids.
- "expressions": 4–6 phrases from the story worth memorising, with natural Korean meanings.
- "tips": in Korean, 2–3 concrete ways to bend this story to other questions.
- "title" in Korean.

Topics:
${TOPIC_LIST}`;
}

export function storyUserPrompt(req: Pick<StoryRequest, "topicIds" | "memo" | "level">): string {
  const topics = req.topicIds.map((id) => `${id} (${topicById(id)?.label ?? id})`).join(", ");
  return `Topics chosen: ${topics}
Target grade: ${req.level}

The learner's notes about the experience (Korean or English):
${req.memo.trim()}`;
}
