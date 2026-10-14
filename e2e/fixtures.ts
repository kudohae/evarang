import type { Page, Route } from "@playwright/test";

/*
  Network stand-ins for the e2e runs: transcription and AI feedback answer instantly with fixed,
  schema-valid content, so the tests exercise the app's own flow and nothing outside it.
*/

const ANSWERS = [
  "Hi, um, my name is Jiwoo. I'm twenty six years old and I live in Seoul with my family. Uh, I like watching movies.",
  "Um, I live in a apartment in Seoul with my parents. || It have three rooms and two bathroom. My room is small but I like it.",
  "I usually, um, do the dishes after dinner. And on weekend I clean my room and my mother do the laundry.",
  "When I was child, I lived in a small house in Busan. || There was a garden and my grandmother grow vegetables.",
  "I like action movie and comedy movie. Um, my favorite movie is Avengers because the story is very exciting.",
];

function fakeTranscript(n: number) {
  const tokens = ANSWERS[(n - 1) % ANSWERS.length].split(/\s+/);
  const words: { text: string; start: number; end: number; confidence: number }[] = [];
  let t = 1200;
  for (const tok of tokens) {
    if (tok === "||") {
      t += 2600;
      continue;
    }
    words.push({ text: tok, start: t, end: t + 320, confidence: 0.94 });
    t += 420;
  }
  return { text: words.map((w) => w.text).join(" "), words, audioSeconds: t / 1000 };
}

/** Answers every transcription request; the `fallbackAt`-th call reports the backup engine. */
export async function mockTranscribe(page: Page, opts: { fallbackAt?: number } = {}) {
  let n = 0;
  await page.route("**/api/transcribe", async (route: Route) => {
    n++;
    const body = { ...fakeTranscript(n), ...(opts.fallbackAt && n === opts.fallbackAt ? { fallback: "credits" } : {}) };
    await route.fulfill({ json: body });
  });
}

function answerFeedback(number: number) {
  return {
    number,
    verdict: "질문에 답했지만 문장이 짧습니다.",
    performance: "IM1",
    task: { result: "partial", comment: "핵심은 답했으나 세부가 부족합니다." },
    corrections: [{ original: "a apartment", corrected: "an apartment", kind: "grammar", reason: "모음 앞에는 an을 씁니다.", skill: "grammar.article" }],
    upgrades: [],
    structure: { opening: true, development: false, closing: false, comment: "전개가 짧습니다." },
    strengths: ["질문에 바로 답했습니다."],
    model_answer: "I live in an apartment in Seoul with my parents.",
    skills: [
      { skill: "structure.opening", verdict: "strong" },
      { skill: "grammar.article", verdict: "weak" },
    ],
  };
}

const OVERALL = {
  grade: "IM2",
  range_low: "IM1",
  range_high: "IM3",
  verdict: "일상 주제에 대해 문장 단위로 꾸준히 말합니다.",
  criteria: [
    { key: "functions", rating: 3, comment: "기본 과제를 수행합니다." },
    { key: "content", rating: 3, comment: "익숙한 주제 중심입니다." },
    { key: "accuracy", rating: 2, comment: "관사와 수 일치 오류가 잦습니다." },
    { key: "text_type", rating: 2, comment: "문장 나열이 많습니다." },
  ],
  next_grade: "IM3",
  to_next: [{ title: "과거 시제 유지", detail: "경험을 말할 때 과거형을 유지하세요.", before: "my grandmother grow vegetables", after: "my grandmother grew vegetables" }],
  patterns: [{ title: "관사 누락", detail: "모음 앞 관사", examples: ["a apartment"], skill: "grammar.article" }],
  plan: [{ title: "과거 경험 말하기", detail: "매일 한 가지 경험을 과거형으로 말해 보세요." }],
};

const USAGE = { inputTokens: 100, outputTokens: 100 };

/** Answers the per-answer feedback and overall verdict requests with fixed, schema-valid content. */
export async function mockFeedback(page: Page) {
  const answer = async (route: Route) => {
    const body = route.request().postDataJSON() as { lens?: string; ref?: string; context: { items: { question: { number: number } }[] } };
    // The real API rejects requests without these; fail the same way so the tests notice.
    if (!body.ref || !body.lens) return route.fulfill({ status: 400, json: { error: "요청 형식이 올바르지 않습니다.", kind: "invalid" } });
    await route.fulfill({ json: { items: body.context.items.map((i) => answerFeedback(i.question.number)), usage: USAGE } });
  };
  const overall = (route: Route) => route.fulfill({ json: { overall: OVERALL, usage: USAGE } });
  await page.route("**/api/feedback/answers", answer);
  await page.route("**/api/feedback/overall", overall);
}

/** Webfonts come from a CDN; the tests do not need them. */
export async function blockFonts(page: Page) {
  await page.route(/cdn\.jsdelivr\.net/, (route) => route.abort());
}
