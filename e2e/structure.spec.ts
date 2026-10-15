import { expect, test, type Page } from "@playwright/test";
import { blockFonts, connectMic, keepMicStream, micState, mockFeedback, mockTranscribe } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
  await mockTranscribe(page);
});

const part = (page: Page, title: string) => page.locator("li", { has: page.getByRole("heading", { name: new RegExp(`^${title}`) }) });

async function record(page: Page, title: string) {
  const card = part(page, title);
  await card.getByRole("button", { name: /^(녹음|다시 녹음)$/ }).click();
  await page.waitForTimeout(700);
  await card.getByRole("button", { name: "녹음 끝내기" }).click();
  await expect(card.getByText("받아쓰는 중")).toHaveCount(0, { timeout: 30_000 });
}

test("a question answered in four recorded parts is judged together", async ({ page }) => {
  await page.goto("/structure");
  await expect(page.getByText("서비스 준비 중")).toBeVisible();
  await page.getByRole("button", { name: "과거 경험", exact: true }).click();
  await page.getByRole("button", { name: "질문 받기" }).click();
  await expect(page.getByRole("button", { name: "질문 듣기" })).toBeVisible();
  await connectMic(page);

  const evaluate = page.getByRole("button", { name: "평가", exact: true });
  await expect(evaluate).toBeDisabled();
  for (const t of ["두괄식", "이유", "예시", "감정·생각"]) await record(page, t);
  await expect(page.getByText("4/4 단계 녹음")).toBeVisible();

  // A second take for the first part, then go back to the first.
  await record(page, "두괄식");
  const first = part(page, "두괄식");
  await expect(first.getByRole("radio")).toHaveCount(2);
  await expect(first.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
  await first.getByRole("radio").nth(0).click();
  await expect(first.getByRole("radio").nth(0)).toHaveAttribute("aria-checked", "true");

  await expect(evaluate).toBeEnabled();
  await evaluate.click();
  await expect(page.getByRole("heading", { name: "평가", exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("두괄식이 분명합니다")).toBeVisible();
  await expect(page.getByText("부족")).toBeVisible();
  await expect(page.getByText("네 단계를 이은 모범 답안")).toBeVisible();
});

test("the microphone stays connected across questions and pages", async ({ page }) => {
  await page.goto("/structure");
  await page.getByRole("button", { name: "질문 받기" }).click();
  await connectMic(page);
  await expect(part(page, "두괄식").getByRole("button", { name: "녹음" })).toBeVisible();
  await page.getByRole("button", { name: "유형·주제 다시 고르기" }).click();
  await page.getByRole("button", { name: "질문 받기" }).click();
  await expect(page.getByRole("button", { name: "마이크 연결" })).toHaveCount(0);
  await page.getByRole("banner").getByRole("link", { name: "맞춤형 연습" }).click();
  await page.getByRole("button", { name: "묘사", exact: true }).click();
  await expect(page.getByRole("button", { name: "질문 듣기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "마이크 연결" })).toHaveCount(0);
});

test("the microphone is let go a while after leaving the screens that record", async ({ page }) => {
  await page.clock.install();
  await keepMicStream(page);
  await page.goto("/structure");
  await page.getByRole("button", { name: "질문 받기" }).click();
  await connectMic(page);
  await expect(part(page, "두괄식").getByRole("button", { name: "녹음" })).toBeVisible();
  expect(await micState(page)).toBe("live");
  await page.getByRole("banner").getByRole("link", { name: "스토리뱅크" }).click();
  await expect(page.getByRole("heading", { name: "스토리뱅크" })).toBeVisible();
  await page.clock.fastForward(30_000);
  expect(await micState(page)).toBe("live");
  await page.clock.fastForward(20_000);
  await expect.poll(() => micState(page)).toBe("ended");
});

test("switching question while recording frees the other parts, and a deleted take stays deleted", async ({ page }) => {
  await page.goto("/structure");
  await page.getByRole("button", { name: "질문 받기" }).click();
  await connectMic(page);
  await part(page, "두괄식").getByRole("button", { name: "녹음" }).click();
  await expect(part(page, "이유").getByRole("button", { name: "녹음" })).toBeDisabled();
  await page.getByRole("button", { name: "다른 질문" }).click();
  await expect(part(page, "이유").getByRole("button", { name: "녹음" })).toBeEnabled();
  await expect(part(page, "두괄식").getByRole("button", { name: "녹음" })).toBeEnabled();

  // Record, delete at once while it is still being transcribed: it must not come back.
  await page.route("**/api/transcribe", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fallback();
  });
  const card = part(page, "이유");
  await card.getByRole("button", { name: "녹음" }).click();
  await page.waitForTimeout(700);
  await card.getByRole("button", { name: "녹음 끝내기" }).click();
  await card.getByRole("button", { name: /지우기/ }).first().click();
  await page.waitForTimeout(2500);
  await expect(card.getByRole("radio")).toHaveCount(0);
});
