import { expect, test, type Page } from "@playwright/test";
import { blockFonts, mockTranscribe } from "./fixtures";

/** A finished, evaluated mock test, written straight into this browser's store. */
async function seedExam(page: Page) {
  await page.goto("/notes");
  await page.getByRole("heading", { name: "첨삭노트" }).waitFor();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("evarang");
        req.onsuccess = () => {
          const tx = req.result.transaction("results", "readwrite");
          const feedback = (n: number, before: string, after: string, skill?: string) => ({
            number: n,
            verdict: "",
            performance: "IM1",
            task: { result: "full", comment: "" },
            corrections: [{ original: before, corrected: after, kind: "grammar", reason: "이유 설명", ...(skill ? { skill } : {}) }],
            upgrades: [],
            structure: { opening: true, development: true, closing: true, comment: "" },
            strengths: [],
            model_answer: "",
            skills: skill ? [{ skill, verdict: "weak" }] : [],
          });
          tx.objectStore("results").put(
            {
              id: "seedexam01",
              createdAt: 1000,
              finishedAt: 2000,
              timedOut: false,
              survey: {},
              startLevel: 4,
              adjustment: "same",
              finalLevel: 4,
              questions: [
                { number: 2, topicId: "home", topicLabel: "거주지", type: "describe", text: "Tell me about your home.", scored: true },
                { number: 3, topicId: "home", topicLabel: "거주지", type: "past", text: "Tell me about a change.", scored: true },
              ],
              answers: [],
              evaluations: [
                { id: "ev1", modelId: "gemini-3.8-flash", createdAt: 3000, questions: [feedback(2, "a apartment", "an apartment", "grammar.article"), feedback(3, "I go there", "I went there")], usage: { inputTokens: 0, outputTokens: 0 }, errors: [] },
              ],
            },
            "seedexam01",
          );
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();
}

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockTranscribe(page);
});

test("corrections become cards and reviewing them moves them on", async ({ page }) => {
  await seedExam(page);
  await expect(page.getByText("오늘 복습할 카드 2장")).toBeVisible();
  await expect(page.getByRole("heading", { name: "관사" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "분류 안 됨" })).toBeVisible();

  await page.getByRole("button", { name: "복습 시작" }).click();
  await page.getByRole("button", { name: "마이크 없이 하기" }).click();
  await page.getByRole("button", { name: "정답 보기" }).click();
  await page.getByRole("button", { name: "맞혔어요" }).click();
  await page.getByRole("button", { name: "정답 보기" }).click();
  await page.getByRole("button", { name: "틀렸어요" }).click();
  await expect(page.getByText("2장 중 1장을 맞혔습니다")).toBeVisible();
  await page.getByRole("button", { name: "첨삭노트로" }).click();

  // The one answered right waits for later; the miss is due again.
  await expect(page.getByText("오늘 복습할 카드 1장")).toBeVisible();
  await page.reload();
  await expect(page.getByText("오늘 복습할 카드 1장")).toBeVisible();
  await expect(page.getByText("복습 2단계")).toBeVisible();

  await page.getByRole("button", { name: "숨기기" }).first().click();
  await expect(page.getByRole("heading", { name: "숨긴 카드" })).toBeVisible();
});

test("saying the correction aloud is checked against it", async ({ page }) => {
  await page.route("**/api/transcribe", (route) => route.fulfill({ json: { text: "I live in an apartment.", words: [], audioSeconds: 2 } }));
  await seedExam(page);
  await page.getByRole("button", { name: "복습 시작" }).click();
  await page.getByRole("button", { name: "마이크 연결" }).click();
  const card = page.locator("p[lang=en]").first();
  const before = await card.textContent();
  await page.getByRole("button", { name: "고쳐서 말하기" }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "다 말했어요" }).click();
  await expect(page.getByText(before?.includes("apartment") ? "맞았습니다" : "아쉽습니다")).toBeVisible();
});
