import type { SkillId } from "@/lib/domain/skills";
import type { LensId } from "@/lib/feedback/lenses";
import type { AnswerFeedback } from "@/lib/feedback/schema";
import type { QuestionType } from "@/lib/types";

/*
  문장 구조화 연습: build an answer's skeleton one part at a time — answer first, then a reason, an example,
  a closing thought — and finally all four together.
*/

export type StepId = "opening" | "reason" | "example" | "closing" | "full";

export type Step = {
  id: StepId;
  title: string;
  lens: LensId;
  skills: SkillId[];
  explain: string;
  frames: string[];
  /** Question types that suit this step. */
  types: QuestionType[];
};

export const STEPS: Step[] = [
  {
    id: "opening",
    title: "바로 답하기",
    lens: "structure.opening",
    skills: ["structure.opening"],
    explain: "첫 문장에서 질문에 바로 답합니다. 배경 설명이나 'Well, let me think…'로 시간을 끌기보다 결론을 먼저 말해야, 듣는 사람이 과제를 해냈다고 봅니다.",
    frames: ["I'd say my favorite … is … .", "To be honest, I usually … .", "Yes, I remember one time when … ."],
    types: ["describe", "routine", "issue"],
  },
  {
    id: "reason",
    title: "이유",
    lens: "structure.reason",
    skills: ["structure.reason"],
    explain: "답 바로 뒤에 이유를 하나 붙입니다. because, the main reason is 같은 이유 표지를 쓰면 문장이 이어지고, 그냥 나열하는 답변에서 벗어납니다.",
    frames: ["The main reason is that … .", "That's because … .", "One thing I really like about it is … ."],
    types: ["describe", "issue", "routine"],
  },
  {
    id: "example",
    title: "예시·경험",
    lens: "structure.example",
    skills: ["structure.example"],
    explain: "이유를 뒷받침하는 구체적인 예나 내 경험을 하나 듭니다. 언제, 어디서, 누구와 같은 세부가 들어가면 같은 말을 되풀이하지 않고도 길게 말할 수 있습니다.",
    frames: ["For example, last summer I … .", "I remember one time when … .", "Let me give you an example. A few weeks ago, … ."],
    types: ["past", "describe"],
  },
  {
    id: "closing",
    title: "생각·감정으로 마무리",
    lens: "structure.closing",
    skills: ["structure.closing"],
    explain: "끝에 내 생각이나 감정을 한 문장으로 정리합니다. 갑자기 멈추는 대신 마무리 문장이 있으면 답변이 하나의 완결된 덩어리로 들립니다.",
    frames: ["That's why I … .", "Overall, it was a … experience for me.", "I think I'll keep … because … ."],
    types: ["describe", "past", "routine"],
  },
  {
    id: "full",
    title: "처음부터 끝까지",
    lens: "structure.full",
    skills: ["structure.opening", "structure.reason", "structure.example", "structure.closing"],
    explain: "바로 답하기 → 이유 → 예시·경험 → 생각·감정 순서로 한 답변을 완성합니다. 60~90초를 목표로 하세요.",
    frames: ["I'd say … . The main reason is … .", "For example, … .", "That's why … ."],
    types: ["describe", "past", "issue", "compare"],
  },
];

export function stepById(id: string): Step | undefined {
  return STEPS.find((s) => s.id === id);
}

export type StepVerdict = { skill: SkillId; verdict: "strong" | "weak" | "unclear" };

/** How the answer did on this step's skills; a skill the feedback did not tag is "unclear". */
export function stepVerdict(step: Step, feedback: AnswerFeedback | undefined): StepVerdict[] {
  return step.skills.map((skill) => ({ skill, verdict: feedback?.skills?.find((m) => m.skill === skill)?.verdict ?? "unclear" }));
}

/** Steps passed in any session: one answer with every skill of the step strong. */
export function passedSteps(sessions: { settings: Record<string, unknown>; attempts: { feedback?: AnswerFeedback }[] }[]): Set<StepId> {
  const out = new Set<StepId>();
  for (const s of sessions) {
    const step = stepById(String(s.settings.step ?? ""));
    if (!step) continue;
    if (s.attempts.some((a) => a.feedback && stepVerdict(step, a.feedback).every((v) => v.verdict === "strong"))) out.add(step.id);
  }
  return out;
}
