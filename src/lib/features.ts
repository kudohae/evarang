/*
  What the site offers, in menu order. The home menu and the shared header both read this list;
  a feature opens by switching its status.
*/

export type Feature = {
  id: "mock" | "notes" | "practice" | "structure" | "stories";
  label: string;
  href: string;
  status: "open" | "soon";
  description: string;
  /** A short practical note shown beside an open feature (time, equipment). */
  meta?: string;
  children?: { id: string; label: string; description: string }[];
};

export const FEATURES: Feature[] = [
  {
    id: "mock",
    label: "모의고사",
    href: "/test",
    status: "open",
    description: "실제 순서 그대로 12~15문항. 끝나면 예상 등급과 문항별 첨삭을 받습니다.",
    meta: "약 60분 · 마이크 필요",
  },
  { id: "notes", label: "첨삭노트", href: "/notes", status: "soon", description: "모의고사에서 고친 표현을 모아, 소리 내어 다시 말하며 복습합니다." },
  {
    id: "practice",
    label: "맞춤형 연습",
    href: "/practice",
    status: "soon",
    description: "약한 곳만 골라 한 문항씩 연습합니다.",
    children: [
      { id: "by-type", label: "문항별", description: "묘사, 루틴, 과거 경험, 롤플레이, 비교, 사회 이슈" },
      { id: "by-topic", label: "주제별", description: "서베이에서 고른 주제와 돌발 주제" },
    ],
  },
  { id: "structure", label: "문장 구조화 연습", href: "/structure", status: "soon", description: "바로 답하기, 이유, 예시, 내 생각. 한 단계씩 천천히 쌓아 말합니다." },
  { id: "stories", label: "스토리뱅크", href: "/stories", status: "soon", description: "내 경험으로 여러 주제에 돌려 쓸 이야기를 만들어 둡니다." },
];

export function openFeatures(): Feature[] {
  return FEATURES.filter((f) => f.status === "open");
}
