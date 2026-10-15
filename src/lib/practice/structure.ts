import type { StructureFeedback } from "@/lib/feedback/structure";
import type { Transcript } from "@/lib/types";

/*
  문장 구조화 연습: one question answered in four separately recorded parts — answer first (두괄식), reason,
  example, feeling/thought — then judged together. Each part can be recorded as often as wanted; one take
  per part is used.
*/

export type PartId = "opening" | "reason" | "example" | "feeling";

export type FramePart = { id: PartId; title: string; label: string; hint: string; frames: string[]; targetSeconds: [number, number] };

export const FRAME: FramePart[] = [
  {
    id: "opening",
    title: "두괄식",
    label: "바로 답하기",
    hint: "질문에 대한 답을 첫 문장으로 말합니다. 배경 설명보다 결론이 먼저입니다.",
    frames: ["I'd say my favorite … is … .", "To be honest, I usually … .", "Yes, I remember one time when … ."],
    targetSeconds: [4, 12],
  },
  {
    id: "reason",
    title: "이유",
    label: "이유 설명",
    hint: "답 바로 뒤에 이유를 붙입니다. because, the main reason is 같은 표지를 쓰세요.",
    frames: ["The main reason is that … .", "That's because … .", "One thing I really like about it is … ."],
    targetSeconds: [8, 20],
  },
  {
    id: "example",
    title: "예시",
    label: "예시·경험",
    hint: "이유를 뒷받침하는 구체적인 예나 내 경험을 듭니다. 언제, 어디서, 누구와를 넣으면 생생해집니다.",
    frames: ["For example, last summer I … .", "I remember one time when … .", "Let me give you an example. A few weeks ago, … ."],
    targetSeconds: [15, 40],
  },
  {
    id: "feeling",
    title: "감정·생각",
    label: "마무리",
    hint: "내 생각이나 감정으로 정리합니다. 갑자기 멈추지 말고 한 문장으로 닫으세요.",
    frames: ["That's why I … .", "Overall, it was a … experience for me.", "I think I'll keep … because … ."],
    targetSeconds: [4, 12],
  },
];

export type Take = { id: string; audioKey: string; mimeType: string; durationMs: number; createdAt: number; transcript?: Transcript; error?: string };

export type StructureDrill = {
  parts: Record<PartId, Take[]>;
  /** The take used for each part; the newest when unset. */
  chosen: Partial<Record<PartId, string>>;
  feedback?: StructureFeedback;
  modelId?: string;
};

export function emptyDrill(): StructureDrill {
  return { parts: { opening: [], reason: [], example: [], feeling: [] }, chosen: {} };
}

/** Adds or replaces a take (same id), keeping the order recorded. */
export function withTake(d: StructureDrill, part: PartId, t: Take): StructureDrill {
  const list = d.parts[part] ?? [];
  const parts = { ...d.parts, [part]: list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t] };
  return { ...d, parts };
}

export function chosenTakes(d: StructureDrill): Partial<Record<PartId, Take>> {
  const out: Partial<Record<PartId, Take>> = {};
  for (const p of FRAME) {
    const list = d.parts[p.id] ?? [];
    out[p.id] = list.find((t) => t.id === d.chosen[p.id]) ?? list[list.length - 1];
  }
  return out;
}

/** Every part has a chosen take with something transcribed. */
export function readyToEvaluate(d: StructureDrill): boolean {
  const c = chosenTakes(d);
  return FRAME.every((p) => Boolean(c[p.id]?.transcript?.text.trim()));
}

const FILLERS = new Set(["um", "uh", "er", "erm", "hmm", "uhm", "ah"]);

export function takeStats(t: Take): { seconds: number; words: number } {
  const words = (t.transcript?.text ?? "")
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((w) => w && !FILLERS.has(w)).length;
  return { seconds: Math.round(t.durationMs / 100) / 10, words };
}
