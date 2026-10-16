import { expect, test, type Page } from "@playwright/test";
import { INVITE } from "../playwright.accounts.config";
import { blockFonts } from "./fixtures";

/* The site behind a login: what a visitor sees before and after signing in, and after signing out. */

const PASSWORD = "e2e-password-1";
const email = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
});

const loginScreen = (page: Page) => page.getByRole("heading", { name: "로그인", exact: true });

async function signUp(page: Page, address: string, invite = INVITE) {
  await page.getByRole("link", { name: "가입하기" }).click();
  await page.getByLabel("초대 코드").fill(invite);
  await page.getByLabel("이메일").fill(address);
  await page.getByLabel("닉네임").fill("테스트");
  await page.getByLabel("비밀번호", { exact: true }).fill(PASSWORD);
  await page.getByLabel("비밀번호 확인").fill(PASSWORD);
  await page.getByText("위 내용에 동의합니다.").click();
  await page.getByText("만 14세 이상입니다.").click();
  await page.getByRole("button", { name: "가입하기" }).click();
}

test("a visitor who has not signed in sees the login screen on every page", async ({ page }) => {
  for (const path of ["/", "/practice", "/notes", "/test", "/structure"]) {
    await page.goto(path);
    await expect(loginScreen(page)).toBeVisible();
    await expect(page.getByRole("navigation", { name: "기능" })).toHaveCount(0);
  }
  await expect(page.getByLabel("접근 코드")).toHaveCount(0);
});

test("the API refuses a visitor who has not signed in, invite code or not", async ({ request }) => {
  // The old entry screen's code no longer opens anything.
  await request.post("/api/access", { data: { code: INVITE } });
  expect((await request.get("/api/me/docs?kind=exam")).status()).toBe(401);
  expect((await request.post("/api/feedback/answers", { data: {} })).status()).toBe(401);
  expect((await request.post("/api/transcribe", { data: {} })).status()).toBe(401);
});

test("sign-up needs the invite code, then the page asked for opens", async ({ page }) => {
  await page.goto("/practice");
  await expect(loginScreen(page)).toBeVisible();
  await signUp(page, email(), "wrong-code");
  await expect(page.getByText("초대 코드가 맞지 않습니다.")).toBeVisible();
  await page.getByLabel("초대 코드").fill(INVITE);
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.getByRole("heading", { name: "맞춤형 연습" })).toBeVisible();
});

test("signing out returns to the login screen, and signing in there opens the site", async ({ page }) => {
  const address = email();
  await page.goto("/");
  await signUp(page, address);
  await expect(page.getByRole("navigation", { name: "기능" })).toBeVisible();

  await page.goto("/account");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(loginScreen(page)).toBeVisible();

  // Signing in on the login screen of another page keeps that page.
  await page.goto("/notes");
  await page.getByLabel("이메일").fill(address);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("heading", { name: "첨삭노트" })).toBeVisible();
});
