import { expect, test, type Page } from "@playwright/test";
import { blockFonts } from "./fixtures";

const ORDER = ["모의고사", "첨삭노트", "맞춤형 연습", "문장 구조화 연습", "스토리뱅크"];

/** The shared header: wordmark, every open feature, sign-in. */
async function expectShell(page: Page) {
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "에바랑" })).toBeVisible();
  const nav = header.getByRole("navigation", { name: "기능" });
  for (const label of ORDER) await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(1);
  const coffee = header.getByRole("link", { name: /Buy me a coffee/ });
  await expect(coffee).toBeVisible();
  await expect(coffee).toHaveAttribute("href", "https://www.buymeacoffee.com/hinoamchomsky02");
  await expect(coffee).toHaveAttribute("target", "_blank");
}

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
});

test("home menu comes from the feature list", async ({ page }) => {
  await page.goto("/");
  const menu = page.getByRole("navigation", { name: "메뉴" });
  const items = menu.locator(":scope > ul > li");
  await expect(items).toHaveCount(5);
  for (let i = 0; i < ORDER.length; i++) await expect(items.nth(i)).toContainText(ORDER[i]);
  await expect(menu.getByRole("link")).toHaveCount(5);
  for (let i = 0; i < ORDER.length; i++) await expect(items.nth(i).getByRole("link")).toContainText(ORDER[i]);
  await expect(page.locator("[aria-disabled=true]")).toHaveCount(0);
  await expect(items.nth(2)).toContainText("문항별");
  await expect(items.nth(2)).toContainText("주제별");
  await expectShell(page);
});

test("every page outside the test shares the header", async ({ page }) => {
  for (const path of ["/results/missing123", "/login", "/privacy", "/practice", "/structure", "/notes", "/stories", "/sessions/missing123"]) {
    await page.goto(path);
    await expectShell(page);
  }
});

test("the header fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await expectShell(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.getByRole("banner").screenshot({ path: "test-results/shell-390.png" });
});
