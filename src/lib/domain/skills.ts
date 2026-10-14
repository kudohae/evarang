/*
  Weak-point labels: the shared vocabulary of feedback, review notes, practice suggestions and progress.
  Ids are permanent because stored records point at them; labels may change.
*/

export const SKILL_IDS = [
  "structure.opening",
  "structure.reason",
  "structure.example",
  "structure.closing",
  "tense.past",
  "tense.consistency",
  "grammar.agreement",
  "grammar.article",
  "grammar.preposition",
  "grammar.plural",
  "grammar.word_order",
  "vocab.repetition",
  "vocab.precision",
  "cohesion.connectors",
  "cohesion.sentence_variety",
  "fluency.fillers",
  "fluency.pauses",
  "task.questions",
  "task.problem_solving",
  "task.comparison",
  "task.description",
] as const;

export type SkillId = (typeof SKILL_IDS)[number];
export type SkillGroup = "structure" | "tense" | "grammar" | "vocab" | "cohesion" | "fluency" | "task";
export type Skill = { id: SkillId; group: SkillGroup; label: string; definition: string };

export const SKILL_GROUP_LABEL: Record<SkillGroup, string> = {
  structure: "구조",
  tense: "시제",
  grammar: "문법",
  vocab: "어휘",
  cohesion: "연결",
  fluency: "유창성",
  task: "과제",
};

const DEFS: Record<SkillId, [string, string]> = {
  "structure.opening": ["바로 답하기", "The first sentence answers the question directly before any detail."],
  "structure.reason": ["이유", "Gives a clear reason for the main point, introduced with a reason marker."],
  "structure.example": ["예시·경험", "Supports the point with a concrete example or a specific personal experience."],
  "structure.closing": ["생각·감정으로 마무리", "Ends with a closing sentence that states a feeling, opinion or takeaway."],
  "tense.past": ["과거 시제", "Uses past-tense forms correctly when narrating past events."],
  "tense.consistency": ["시제 일관성", "Keeps the time frame consistent and shifts tense only when the time frame shifts."],
  "grammar.agreement": ["주어-동사 일치", "Verbs agree with their subjects (he goes, they go)."],
  "grammar.article": ["관사", "Uses a/an/the correctly, including a before consonant and an before vowel sounds."],
  "grammar.preposition": ["전치사", "Chooses the right prepositions (in, on, at, to, for…)."],
  "grammar.plural": ["복수형", "Marks plural nouns and countability correctly."],
  "grammar.word_order": ["어순", "Puts words in natural English order, including in questions."],
  "vocab.repetition": ["같은 말 반복", "Avoids repeating the same words and phrases; varies vocabulary."],
  "vocab.precision": ["정확한 단어 선택", "Chooses precise, natural words and collocations instead of vague or literal ones."],
  "cohesion.connectors": ["연결어", "Links ideas with connectors (because, so, while, however, after that…)."],
  "cohesion.sentence_variety": ["문장 길이", "Combines ideas into varied sentences instead of a string of short simple ones."],
  "fluency.fillers": ["군말", "Keeps fillers (um, uh, like) from interrupting the flow of speech."],
  "fluency.pauses": ["긴 멈춤", "Avoids long silent pauses inside the answer."],
  "task.questions": ["질문하기", "Asks several well-formed, relevant questions when the task calls for questions."],
  "task.problem_solving": ["문제 해결", "Explains the problem and offers workable alternatives when resolving a situation."],
  "task.comparison": ["비교·변화", "Compares two things or past and present with clear contrasts."],
  "task.description": ["구체적 묘사", "Describes people, places and things with specific, vivid details."],
};

export const SKILLS: readonly Skill[] = SKILL_IDS.map((id) => ({
  id,
  group: id.split(".")[0] as SkillGroup,
  label: DEFS[id][0],
  definition: DEFS[id][1],
}));

const BY_ID = new Map(SKILLS.map((s) => [s.id as string, s]));

export function skillById(id: string): Skill | undefined {
  return BY_ID.get(id);
}
