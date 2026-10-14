import { SKILLS } from "@/lib/domain/skills";
import type { Lens } from "@/lib/feedback/lenses";
import type { AnswerMetrics } from "@/lib/metrics";
import type { ExamQuestion, Level } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/exam/compose";

export type EvalItem = {
  question: ExamQuestion;
  transcript: string;
  metrics: AnswerMetrics | null;
};

export type EvalContext = {
  startLevel: Level;
  finalLevel: Level;
  items: EvalItem[];
};

const RUBRIC = `
You rate English speaking on the ACTFL scale as used by the OPIc test: NL, NM, NH, IL, IM1, IM2, IM3, IH, AL.

Four criteria, judged from the transcript only:
- functions: which global tasks the speaker can actually carry out — listing and naming (Novice); creating with language, asking and answering simple questions, handling a simple transaction (Intermediate); narrating and describing in past, present and future, and resolving a complication (Advanced).
- content: how far the speaker moves beyond the most familiar personal topics, and how specific and relevant the details are.
- accuracy: grammar, word choice and comprehensibility to a sympathetic listener. Pronunciation is NOT assessed — never comment on it.
- text_type: words → sentences → strings of sentences → connected paragraphs with cohesive devices.

Level anchors:
- Novice: memorised words and phrases, little sentence creation.
- IL: short, simple, often disconnected sentences on familiar topics.
- IM1–IM3: steady sentence-level speech on everyday topics. IM1 sentences are short and repetitive; IM2 is consistent across tasks but rarely builds paragraphs; IM3 regularly attempts paragraphs and past narration but breaks down often.
- IH: paragraph-length speech on most tasks, moves between time frames, but cannot sustain Advanced performance across all of them (role-play complications or comparisons break down).
- AL: sustains paragraph-level narration and description in all major time frames and handles a complication, with errors that do not confuse the listener.

About the transcripts:
- They are verbatim speech recognition output. Fillers (um, uh) are real. Long silences are listed in the metrics.
- Recognition can mishear words. If a word is listed as low-confidence and looks like a recognition error, do not treat it as the speaker's mistake.
- An empty or near-empty transcript means the speaker said little or nothing.

Fluency signals you may use as evidence for text type and functions (not for pronunciation): words per minute, fillers per minute, pauses of 2s+, delay before the first word.
`.trim();

function describeItem(item: EvalItem): string {
  const m = item.metrics;
  const metricLine = m
    ? `recorded ${m.seconds.toFixed(0)}s · ${m.words} words · ${m.wpm.toFixed(0)} wpm · ${m.fillers} fillers (${m.fillersPerMin.toFixed(1)}/min) · ${m.longPauses} pauses ≥2s (longest ${m.longestPause.toFixed(1)}s) · first word after ${m.startDelay.toFixed(1)}s${
        m.lowConfidence.length ? ` · low-confidence words: ${m.lowConfidence.join(", ")}` : ""
      }`
    : "no transcript";
  return [
    `### Q${item.question.number} (${item.question.type} — ${TYPE_LABEL[item.question.type]})${item.question.scored ? "" : " [not scored]"}`,
    `Question: ${item.question.text}`,
    `Metrics: ${metricLine}`,
    `Transcript:`,
    item.transcript.trim() ? item.transcript.trim() : "(no speech)",
  ].join("\n");
}

const SKILL_LIST = SKILLS.map((s) => `- ${s.id}: ${s.definition}`).join("\n");

function skillRules(lens: Lens): string {
  return `Skill tags. Use only these ids:
${SKILL_LIST}

- "skills": list the skills this answer clearly shows as a strength ("strong") or a weakness ("weak"). Only tag what the transcript gives evidence for; leave a skill out when unsure. Pay most attention to: ${lens.focus.join(", ")}.
- Give each correction and upgrade the "skill" it belongs to when one fits; leave it out otherwise.`;
}

export function answersSystemPrompt(lens: Lens): string {
  return `${RUBRIC}

Your job now: give detailed, per-answer feedback a Korean learner can act on.

Rules:
- Write every explanation in Korean. Keep English quotes and corrected English in English.
- "original" in corrections and upgrades must be copied exactly, character for character, from the transcript so it can be highlighted. Keep each span short (a few words to one sentence).
- Corrections are for real errors only. Do not "correct" natural spoken English or fillers.
- Prioritise. List the corrections that most affect the rating first; skip trivial ones if there are many.
- The model answer keeps the speaker's own facts and ideas, rewritten one level above their performance (up to AL). Spoken, natural, not written prose. Roughly 60–90 seconds of speech at most.
- Judge task completion against what the question actually asked (e.g. "ask three or four questions", "suggest two or three alternatives", "compare past and present").
- Be direct. No praise that the transcript does not support.

${skillRules(lens)}

Focus for this feedback: ${lens.instructions}`;
}

export function answersUserPrompt(ctx: EvalContext): string {
  return `Self-assessment level chosen: ${ctx.startLevel}, after re-adjustment: ${ctx.finalLevel}.

Give feedback for each answer below, one item per question, in the same order.

${ctx.items.map(describeItem).join("\n\n")}`;
}

export function overallSystemPrompt(): string {
  return `${RUBRIC}

Your job now: assign one holistic rating for the whole sample, the way an OPIc rater would.

Rules:
- Rate the sustained floor of performance across the scored answers, not the best answer. The self-introduction (Q1) is not scored.
- A rating requires evidence: the speaker must sustain that level's functions across the relevant tasks. If Advanced tasks (comparisons, role-play complications, issues) were not asked at this difficulty, the sample cannot prove Advanced; say so in the verdict when relevant.
- range_low and range_high give the plausible spread, at most two steps apart.
- Write explanations in Korean, quoting the speaker's actual English as evidence.
- "to_next": the changes that would most move this speaker to the next grade. "before" must be a sentence the speaker actually said; "after" is the same idea at the next grade.
- "patterns": habits that recur across several answers (e.g. tense drift, the same filler, sentences always joined with "and"). Give each pattern the "skill" id it belongs to when one fits:
${SKILL_LIST}
- "plan": concrete practice for the next attempt, not generic advice.
- Return the four criteria exactly once each: functions, content, accuracy, text_type.`;
}

export function overallUserPrompt(ctx: EvalContext): string {
  return `Self-assessment level chosen: ${ctx.startLevel}, after re-adjustment: ${ctx.finalLevel}. Questions asked: ${ctx.items.length}.

${ctx.items.map(describeItem).join("\n\n")}`;
}
