import { expect, test, type Page } from "@playwright/test";
import { blockFonts, connectMic, mockTranscribe } from "./fixtures";

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

test("mistake types at the top filter the cards and the review", async ({ page }) => {
  await seedExam(page);
  await expect(page.getByRole("button", { name: /오늘 복습\s*2/ })).toBeVisible();
  await page.getByRole("button", { name: /^문법/ }).click();
  await expect(page.getByRole("button", { name: /^관사/ })).toBeVisible();
  await expect(page.getByText("문법 · 1장")).toBeVisible();
  await expect(page.getByText("an apartment")).toBeVisible();
  await expect(page.getByText("I went there")).toHaveCount(0);

  await page.getByRole("button", { name: "1장 복습 시작" }).click();
  await page.getByRole("button", { name: /정답 보기/ }).click();
  await page.getByRole("button", { name: /맞혔어요/ }).click();
  await expect(page.getByText("모두 맞혔습니다")).toBeVisible();
  await page.getByRole("button", { name: "첨삭노트로" }).click();
  await expect(page.getByRole("button", { name: /오늘 복습\s*1/ })).toBeVisible();

  // Keyboard: Space shows the answer, 2 marks it wrong.
  const types = page.getByRole("region", { name: "오답 유형" });
  await types.getByRole("button", { name: /^전체/ }).first().click();
  await page.getByRole("button", { name: "1장 복습 시작" }).click();
  await page.keyboard.press("Space");
  await expect(page.getByText("고친 문장", { exact: true })).toBeVisible();
  await page.keyboard.press("2");
  await expect(page.getByRole("button", { name: "틀린 1장 다시" })).toBeVisible();
  await page.getByRole("button", { name: "첨삭노트로" }).click();

  await page.reload();
  await expect(page.getByRole("button", { name: /오늘 복습\s*1/ })).toBeVisible();
  await page.getByRole("button", { name: /I went there/ }).click();
  await page.getByRole("button", { name: "숨기기" }).click();
  await expect(page.getByText("카드를 숨겼습니다")).toBeVisible();
  await expect(page.getByRole("button", { name: "숨김 1" })).toBeVisible();
});

test("saying the correction aloud is checked, with the missed word shown", async ({ page }) => {
  let said = "I live in a apartment.";
  await page.route("**/api/transcribe", (route) => route.fulfill({ json: { text: said, words: [], audioSeconds: 2 } }));
  await seedExam(page);
  await page.getByRole("button", { name: /^문법/ }).click();
  await page.getByRole("button", { name: "1장 복습 시작" }).click();
  await connectMic(page);
  await page.getByRole("button", { name: "말하기" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "다 말했어요" }).click();
  await expect(page.getByText("아쉽습니다")).toBeVisible();
  await expect(page.locator("span.text-pen-ink", { hasText: "an" })).toBeVisible();

  said = "I live in an apartment.";
  await page.getByRole("button", { name: "다시 말하기" }).click();
  await page.getByRole("button", { name: "말하기" }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "다 말했어요" }).click();
  await expect(page.getByText("맞았습니다")).toBeVisible();
  await page.getByRole("button", { name: "다음 카드" }).click();
  await expect(page.getByText("모두 맞혔습니다")).toBeVisible();
});
