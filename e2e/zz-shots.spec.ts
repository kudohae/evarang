import { test } from "@playwright/test";
import { blockFonts, connectMic, mockFeedback, mockTranscribe } from "./fixtures";

const corr = (o: string, c: string, skill?: string) => ({ original: o, corrected: c, kind: "grammar", reason: "과거 이야기에는 과거형을 씁니다. 주어가 3인칭 단수이면 동사에 s를 붙입니다.", ...(skill ? { skill } : {}) });
const fb = (n: number, cs: unknown[]) => ({ number: n, verdict: "", performance: "IM1", task: { result: "full", comment: "" }, corrections: cs, upgrades: [{ original: "very good", better: "absolutely amazing", reason: "더 생생한 표현입니다.", skill: "vocab.precision" }], structure: { opening: true, development: true, closing: true, comment: "" }, strengths: [], model_answer: "", skills: [] });

test("shots", async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
  await mockTranscribe(page);
  await page.goto("/notes");
  await page.getByRole("heading", { name: "첨삭노트" }).waitFor();
  await page.evaluate((evals) => new Promise<void>((res) => {
    const r = indexedDB.open("evarang");
    r.onsuccess = () => {
      const tx = r.result.transaction("results", "readwrite");
      tx.objectStore("results").put({ id: "shot0001", createdAt: Date.now() - 86400000, finishedAt: 2, timedOut: false, survey: {}, startLevel: 4, adjustment: "same", finalLevel: 4,
        questions: [2, 3, 4].map((n) => ({ number: n, topicId: "home", topicLabel: "거주지", type: "past", text: "Tell me about a memorable thing that happened at your home.", scored: true })), answers: [],
        evaluations: [{ id: "e", modelId: "m", createdAt: 3, usage: { inputTokens: 0, outputTokens: 0 }, errors: [], questions: evals }] }, "shot0001");
      tx.oncomplete = () => res();
    };
  }), [
    fb(2, [corr("I go there last year", "I went there last year", "tense.past"), corr("a apartment", "an apartment", "grammar.article")]),
    fb(3, [corr("my mother cook dinner", "my mother cooks dinner", "grammar.agreement"), corr("in weekend", "on weekends", "grammar.preposition")]),
    fb(4, [corr("It was so so fun", "It was really fun")]),
  ]);
  await page.reload();
  await page.getByRole("button", { name: /오늘 복습\s*\d/ }).waitFor();
  await page.screenshot({ path: "test-results/notes-desktop.png", fullPage: true });
  await page.getByRole("button", { name: /^문법/ }).click();
  await page.getByRole("button", { name: /an apartment/ }).click();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: "test-results/notes-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.getByRole("button", { name: /장 복습 시작/ }).click();
  await page.screenshot({ path: "test-results/notes-review.png" });
  await page.getByRole("button", { name: /정답 보기/ }).click();
  await page.screenshot({ path: "test-results/notes-reveal.png" });

  await page.goto("/structure");
  await page.screenshot({ path: "test-results/structure-pick.png", fullPage: true });
  await page.getByRole("button", { name: "과거 경험", exact: true }).click();
  await page.getByRole("button", { name: "질문 받기" }).click();
  await connectMic(page);
  for (const t of ["두괄식", "이유"]) {
    const card = page.locator("li", { has: page.getByRole("heading", { name: new RegExp(`^${t}`) }) });
    await card.getByRole("button", { name: /^(녹음|다시 녹음)$/ }).click();
    await page.waitForTimeout(800);
    await card.getByRole("button", { name: "녹음 끝내기" }).click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: "test-results/structure-drill.png", fullPage: true });
});
