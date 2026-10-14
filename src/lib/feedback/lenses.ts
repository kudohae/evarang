import type { SkillId } from "@/lib/domain/skills";
import type { QuestionType } from "@/lib/types";

/*
  A lens says what one kind of feedback looks at. The schema is the same for every lens; the lens picks the
  skills to watch, adds instructions to the prompt, and says how heavy the work is ("light" starts lower on
  the free model ladder).
*/

export type LensId =
  | "exam"
  | `type.${QuestionType}`
  | "structure.opening"
  | "structure.reason"
  | "structure.example"
  | "structure.closing"
  | "structure.full";

export type Lens = { id: LensId; focus: SkillId[]; instructions: string; weight: "full" | "light" };

const ALL_STRUCTURE: SkillId[] = ["structure.opening", "structure.reason", "structure.example", "structure.closing"];

function lens(id: LensId, focus: SkillId[], instructions: string, weight: Lens["weight"] = "full"): Lens {
  return { id, focus, instructions, weight };
}

export const LENSES: Record<LensId, Lens> = {
  exam: lens(
    "exam",
    [...ALL_STRUCTURE, "tense.past", "tense.consistency", "grammar.agreement", "grammar.article", "cohesion.connectors", "task.description"],
    "This answer is part of a full mock test. Give complete feedback on every aspect of the answer.",
  ),

  "type.intro": lens(
    "type.intro",
    ["structure.opening", "task.description", "vocab.repetition", "cohesion.sentence_variety"],
    "A self-introduction. It is not scored in the real test, but it sets the rater's first impression: look for a natural, specific picture of the speaker rather than a memorised list.",
  ),
  "type.describe": lens(
    "type.describe",
    ["task.description", "vocab.precision", "structure.example", "cohesion.connectors"],
    "A description question. Judge how concrete and well organised the description is: specific places, objects and details, connected rather than listed.",
  ),
  "type.routine": lens(
    "type.routine",
    ["task.description", "grammar.agreement", "cohesion.connectors", "tense.consistency"],
    "A routine or habit question. Watch for present simple used consistently, third-person agreement, and sequence words that order the steps.",
  ),
  "type.past": lens(
    "type.past",
    ["tense.past", "tense.consistency", "structure.example", "cohesion.connectors"],
    "A past-experience question. The core task is narration in the past: check that past tense is used and kept, and that the story has a clear sequence and a point.",
  ),
  "type.compare": lens(
    "type.compare",
    ["task.comparison", "tense.consistency", "cohesion.connectors", "structure.reason"],
    "A comparison or change-over-time question. Check that both sides are actually compared, that time frames are kept apart, and that contrast words carry the comparison.",
  ),
  "type.issue": lens(
    "type.issue",
    ["structure.reason", "structure.example", "vocab.precision", "cohesion.connectors"],
    "A social-issue or opinion question. Look for a clear position, supporting reasons with examples, and vocabulary beyond everyday words.",
  ),
  "type.ask_ava": lens(
    "type.ask_ava",
    ["task.questions", "grammar.word_order", "cohesion.sentence_variety"],
    "The speaker must ask the interviewer questions. Count the questions, check their word order, and note whether they vary in form.",
  ),
  "type.rp_ask": lens(
    "type.rp_ask",
    ["task.questions", "grammar.word_order", "structure.opening"],
    "A role-play where the speaker gathers information. Check that it opens with a natural greeting or context and asks three or four well-formed, relevant questions.",
  ),
  "type.rp_problem": lens(
    "type.rp_problem",
    ["task.problem_solving", "structure.opening", "structure.reason", "cohesion.connectors"],
    "A role-play with a complication. Check that the speaker explains the problem clearly and offers two or three alternatives; this is an Advanced-level task.",
  ),
  "type.rp_experience": lens(
    "type.rp_experience",
    ["tense.past", "structure.example", "task.description", "tense.consistency"],
    "A role-play follow-up asking about a related experience. Judge it as past narration: tense, sequence and specific detail.",
  ),

  "structure.opening": lens(
    "structure.opening",
    ["structure.opening"],
    "This is a structure drill on the first sentence only. Judge whether the answer opens by answering the question directly in one clear sentence. Keep everything else brief.",
    "light",
  ),
  "structure.reason": lens(
    "structure.reason",
    ["structure.reason"],
    "This is a structure drill on giving reasons. Judge whether the speaker states at least one clear reason for their answer and links it with a connector. Keep everything else brief.",
    "light",
  ),
  "structure.example": lens(
    "structure.example",
    ["structure.example"],
    "This is a structure drill on examples. Judge whether the speaker supports the point with a specific example or personal experience. Keep everything else brief.",
    "light",
  ),
  "structure.closing": lens(
    "structure.closing",
    ["structure.closing"],
    "This is a structure drill on closing. Judge whether the answer ends with the speaker's own thought or feeling instead of stopping abruptly. Keep everything else brief.",
    "light",
  ),
  "structure.full": lens(
    "structure.full",
    ALL_STRUCTURE,
    "This is a structure drill on the whole pattern: direct answer, reason, example, closing thought. Judge each step in order and keep the rest brief.",
    "light",
  ),
};

export function lensForType(t: QuestionType): LensId {
  return `type.${t}`;
}
