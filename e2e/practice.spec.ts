import { expect, test, type Page } from "@playwright/test";
import { blockFonts, mockFeedback, mockTranscribe } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
  await mockTranscribe(page);
});

/** Hears the question, answers, and moves on. */
async function answer(page: Page) {
  await page.getByRole("button", { name: "질문 듣기" }).click();
  const next = page.getByRole("button", { name: "다음" });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  await page.waitForTimeout(600);
  await next.click();
}

test("a practice answer gets feedback and is kept", async ({ page }) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: "묘사", exact: true }).click();
  await page.getByRole("button", { name: "마이크 연결" }).click();
  await answer(page);
  await expect(page.getByText("an apartment").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "같은 설정으로 한 문항 더" })).toBeVisible();

  await page.getByRole("button", { name: "같은 설정으로 한 문항 더" }).click();
  await answer(page);
  await expect(page.getByRole("button", { name: "같은 설정으로 한 문항 더" })).toBeVisible({ timeout: 60_000 });

  await page.getByRole("link", { name: "이번 연습 모아 보기" }).click();
  await expect(page.getByRole("heading", { name: "묘사" })).toBeVisible();
  await expect(page.getByText("2문항")).toBeVisible();

  await page.goto("/practice");
  await expect(page.getByRole("link", { name: /묘사/ })).toBeVisible();
});

test("practice shows the question text and allows a retake", async ({ page }) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: "거주지", exact: true }).click();
  await page.getByRole("button", { name: "마이크 연결" }).click();
  await page.getByRole("button", { name: "질문 듣기" }).click();
  await expect(page.getByRole("button", { name: "다시 말하기" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "질문 보기" }).click();
  await expect(page.locator("p", { hasText: /\?|\./ }).filter({ hasText: /home|live|house|room|neighbor|apartment|chores/i }).first()).toBeVisible();
});
