import { TOPICS, topicById, type Topic } from "@/lib/content/topics";
import type { ExamQuestion, QuestionType } from "@/lib/types";

/* One practice question from the mock test's question bank. */

export const PRACTICE_TYPES: Exclude<QuestionType, "intro">[] = ["describe", "routine", "past", "compare", "issue", "ask_ava", "rp_ask", "rp_problem", "rp_experience"];

function promptsFor(t: Topic, type: QuestionType): string[] {
  switch (type) {
    case "describe":
    case "routine":
    case "past":
    case "compare":
    case "issue":
      return t[type];
    case "ask_ava":
      return t.askAva ? [t.askAva] : [];
    case "rp_ask":
      return t.roleplay ? [t.roleplay.ask] : [];
    case "rp_problem":
      return t.roleplay ? [t.roleplay.problem] : [];
    case "rp_experience":
      return t.roleplay ? [t.roleplay.experience] : [];
    default:
      return [];
  }
}

/** The question types a topic can ask. */
export function typesOf(t: Topic): QuestionType[] {
  return PRACTICE_TYPES.filter((type) => promptsFor(t, type).length > 0);
}

const pick = <T,>(arr: T[], rand: () => number): T => arr[Math.floor(rand() * arr.length)];

/**
 * A question of `type` on `topicId`; either may be left out and is then chosen at random among what fits.
 * `avoid` is the previous question's text, not asked again when anything else fits.
 */
export function practiceQuestion(o: { type?: QuestionType; topicId?: string; avoid?: string }, rand: () => number = Math.random): ExamQuestion {
  const fixed = o.topicId ? topicById(o.topicId) : undefined;
  const topics = (fixed ? [fixed] : TOPICS).filter((t) => (o.type ? promptsFor(t, o.type).length > 0 : typesOf(t).length > 0));
  const pool = topics.length ? topics : TOPICS.filter((t) => (o.type ? promptsFor(t, o.type).length > 0 : true));
  const options = pool.flatMap((t) => (o.type ? [o.type] : typesOf(t)).flatMap((type) => promptsFor(t, type).map((text) => ({ t, type, text }))));
  const fresh = options.filter((x) => x.text !== o.avoid);
  const chosen = pick(fresh.length ? fresh : options, rand);
  return { number: 1, topicId: chosen.t.id, topicLabel: chosen.t.label, type: chosen.type, text: chosen.text, scored: true };
}
