import { expect, test } from "@playwright/test";
import { blockFonts, mockFeedback, mockTranscribe } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
  await mockTranscribe(page);
});

test("a structure step shows its verdict and counts as passed", async ({ page }) => {
  await page.goto("/structure");
  await expect(page.getByText("0/5 통과")).toBeVisible();
  await page.getByRole("button", { name: "바로 답하기 연습하기" }).click();
  await expect(page.getByText("쓸 만한 틀")).toBeVisible();
  await page.getByRole("button", { name: "마이크 연결" }).click();
  await page.getByRole("button", { name: "질문 듣기" }).click();
  const next = page.getByRole("button", { name: "다음" });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  await page.waitForTimeout(600);
  await next.click();
  await expect(page.getByText("잘했습니다")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "다음 단계: 이유" })).toBeVisible();
  await page.getByRole("button", { name: "단계 고르기" }).click();
  await expect(page.getByText("1/5 통과")).toBeVisible();
  await expect(page.getByRole("link", { name: /구조화 · 바로 답하기/ })).toBeVisible();
});
