/*
  Everything that costs money to run, with its daily free allowance. `credits` is the price once paid
  credits exist; nothing reads it yet.
*/

export type ActionId = "exam.evaluate" | "feedback.answer" | "feedback.light" | "transcribe" | "story.generate";

/** `maxPerRef`: requests a day one reference may make after it was counted (batches, retries, model switches). */
export type Action = { label: string; freePerDay: { anon: number; member: number }; credits: number; maxPerRef: number };

export const ACTIONS: Record<ActionId, Action> = {
  "exam.evaluate": { label: "모의고사 평가", freePerDay: { anon: 1, member: 2 }, credits: 10, maxPerRef: 40 },
  "feedback.answer": { label: "답변 피드백", freePerDay: { anon: 10, member: 30 }, credits: 1, maxPerRef: 10 },
  "feedback.light": { label: "구조 연습 피드백", freePerDay: { anon: 30, member: 100 }, credits: 0.3, maxPerRef: 10 },
  transcribe: { label: "받아쓰기", freePerDay: { anon: 40, member: 120 }, credits: 0.2, maxPerRef: 5 },
  "story.generate": { label: "스토리 만들기", freePerDay: { anon: 0, member: 3 }, credits: 5, maxPerRef: 3 },
};

export const ACTION_IDS = Object.keys(ACTIONS) as ActionId[];

/** The notice shown where an evaluation failure would be. */
export function quotaMessage(action: ActionId): string {
  const label = ACTIONS[action].label;
  return `오늘 무료 ${label}${objectParticle(label)} 모두 썼습니다. 내일 0시에 다시 채워집니다.`;
}

/** 을 after a final consonant, 를 after a vowel. */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? "을" : "를";
}
