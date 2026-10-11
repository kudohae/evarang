import { topicsFromSelection } from "@/lib/content/survey";
import { INTRO_QUESTION, TOPICS, type Topic } from "@/lib/content/topics";
import type { Adjustment, ExamQuestion, Level, QuestionType, SurveyAnswers } from "@/lib/types";

/*
  Composition rules, collected from public test-taker reports (see README):
  - Q1 self-introduction, not scored.
  - Session 1 (Q2–7): two combo sets from survey topics.
  - Difficulty re-adjustment after Q7.
  - Session 2: one random-topic combo (Q8–10), then role-play (Q11–13),
    then Q14–15. Final level 1–2 ends at 12 questions; 3–6 at 15.
  - Level 5–6 get the advanced pair (comparison + social issue) at Q14–15.
*/

type Band = "low" | "mid" | "high";

const band = (level: Level): Band => (level <= 2 ? "low" : level <= 4 ? "mid" : "high");

export function questionCount(finalLevel: Level): number {
  return finalLevel <= 2 ? 12 : 15;
}

export function adjustLevel(level: Level, adj: Adjustment): Level {
  const delta = adj === "easier" ? -1 : adj === "harder" ? 1 : 0;
  return Math.min(6, Math.max(1, level + delta)) as Level;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTopic(pool: Topic[], used: Set<string>, ok: (t: Topic) => boolean = () => true): Topic {
  const fresh = pool.filter((t) => !used.has(t.id) && ok(t));
  const fallback = TOPICS.filter((t) => !used.has(t.id) && ok(t));
  const chosen = pick(fresh.length ? fresh : fallback);
  used.add(chosen.id);
  return chosen;
}

function ask(number: number, topic: Topic, type: QuestionType, text: string): ExamQuestion {
  return { number, topicId: topic.id, topicLabel: topic.label, type, text, scored: true };
}

/** Three questions on one topic, never repeating a prompt. */
function combo(start: number, topic: Topic, types: ("describe" | "routine" | "past" | "compare")[]): ExamQuestion[] {
  const remaining: Record<string, string[]> = {
    describe: shuffle(topic.describe),
    routine: shuffle(topic.routine),
    past: shuffle(topic.past),
    compare: shuffle(topic.compare),
  };
  return types.map((type, i) => {
    const list = remaining[type];
    const text = list.length > 1 ? list.shift()! : list[0];
    return ask(start + i, topic, type, text);
  });
}

export type Session1 = { questions: ExamQuestion[]; usedTopics: string[] };

export function composeSession1(survey: SurveyAnswers, level: Level): Session1 {
  const selected = topicsFromSelection([...survey.leisure, ...survey.hobbies, ...survey.sports, ...survey.trips]);
  const surveyPool = TOPICS.filter((t) => t.kind === "survey" && (t.id === "home" || selected.includes(t.id)));
  const used = new Set<string>();
  const b = band(level);
  const pattern: ("describe" | "routine" | "past")[] = b === "high" ? ["describe", "past", "past"] : ["describe", "routine", "past"];

  const a = pickTopic(surveyPool, used);
  const c = pickTopic(surveyPool, used);

  const intro: ExamQuestion = {
    number: 1,
    topicId: "intro",
    topicLabel: "자기소개",
    type: "intro",
    text: INTRO_QUESTION,
    scored: false,
  };

  return {
    questions: [intro, ...combo(2, a, pattern), ...combo(5, c, pattern)],
    usedTopics: [...used],
  };
}

export function composeSession2(survey: SurveyAnswers, finalLevel: Level, usedTopics: string[]): ExamQuestion[] {
  const used = new Set(usedTopics);
  const b = band(finalLevel);
  const randomPool = TOPICS.filter((t) => t.kind === "random");

  const r = pickTopic(randomPool, used);
  const out = combo(8, r, b === "high" ? ["describe", "past", "compare"] : ["describe", "routine", "past"]);

  const selected = topicsFromSelection([...survey.leisure, ...survey.hobbies, ...survey.sports, ...survey.trips]);
  // Role-play comes from what the candidate chose or from the random pool, never from an unchosen survey topic.
  const rpPool = TOPICS.filter((t) => t.kind === "random" || t.id === "home" || selected.includes(t.id));
  const rp = pickTopic(rpPool, used, (t) => Boolean(t.roleplay));
  const play = rp.roleplay!;

  if (questionCount(finalLevel) === 12) {
    out.push(ask(11, rp, "rp_ask", play.ask), ask(12, rp, "rp_experience", play.experience));
    return out;
  }

  out.push(ask(11, rp, "rp_ask", play.ask), ask(12, rp, "rp_problem", play.problem), ask(13, rp, "rp_experience", play.experience));

  const lastPool = TOPICS.filter((t) => selected.includes(t.id) || t.kind === "random");
  const e = pickTopic(lastPool, used);
  out.push(ask(14, e, "compare", pick(e.compare)));
  out.push(b === "high" ? ask(15, e, "issue", pick(e.issue)) : ask(15, e, "ask_ava", e.askAva));
  return out;
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  intro: "자기소개",
  describe: "묘사",
  routine: "루틴·습관",
  past: "과거 경험",
  compare: "비교·변화",
  issue: "사회 이슈",
  ask_ava: "질문하기",
  rp_ask: "롤플레이 · 질문하기",
  rp_problem: "롤플레이 · 문제 해결",
  rp_experience: "롤플레이 · 관련 경험",
};
