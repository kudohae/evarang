import { expect, test, type Page } from "@playwright/test";
import { blockFonts, connectMic, mockFeedback, mockTranscribe } from "./fixtures";

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
  await connectMic(page);
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
  await connectMic(page);
  await page.getByRole("button", { name: "질문 듣기" }).click();
  await expect(page.getByRole("button", { name: "다시 말하기" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "질문 보기" }).click();
  await expect(page.locator("p", { hasText: /\?|\./ }).filter({ hasText: /home|live|hous|room|neighbor|apartment|chores/i }).first()).toBeVisible();
});

test("a refused own key brings up the dialog, and feedback still arrives from the free models", async ({ page }) => {
  await page.route("**/api/config", async (route) => {
    const res = await route.fetch();
    const config = await res.json();
    config.auth = true;
    config.user = { email: "k@example.com", nickname: "키", createdAt: new Date().toISOString(), recordsConsent: false, aiKey: { provider: "gemini", hint: "1234" } };
    config.models = config.models.map((m: { id: string; available: boolean }) => ({ ...m, available: m.id.startsWith("own:") ? true : m.available }));
    await route.fulfill({ json: config });
  });
  await page.route("**/api/feedback/answers", async (route, request) => {
    const body = request.postDataJSON() as { model: string };
    if (body.model.startsWith("own:")) return route.fulfill({ status: 429, json: { error: "내 API 키가 거부되었습니다. 내 정보에서 키를 확인하세요.", kind: "daily" } });
    await route.fallback();
  });
  await page.goto("/practice");
  await page.getByRole("button", { name: "묘사", exact: true }).click();
  await connectMic(page);
  await answer(page);
  await expect(page.getByRole("dialog", { name: "내 API 키를 지금 쓸 수 없습니다" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Google이 내 API 키를 거부했습니다")).toBeVisible();
  await page.getByRole("button", { name: "확인" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "같은 설정으로 한 문항 더" })).toBeVisible({ timeout: 60_000 });
});
