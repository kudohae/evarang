import { expect, test, type Page } from "@playwright/test";
import { blockFonts, mockFeedback, mockTranscribe } from "./fixtures";

/** Home → consent → survey → self assessment → setup → sample skipped → "시험 시작". */
async function reachFirstQuestion(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: /모의고사/ }).first().click();
  await page.getByRole("button", { name: "시작" }).click();
  await page.getByText("위 내용에 동의합니다.").click();
  await page.getByText("만 14세 이상입니다.").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("일 경험 없음").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("수강 후 5년 이상 지남").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("가족(배우자").click();
  await page.getByRole("button", { name: "다음" }).click();
  for (const t of ["영화 보기", "공연 보기", "콘서트 보기", "공원 가기", "카페/커피전문점 가기", "음악 감상하기", "요리하기", "조깅", "걷기", "헬스", "국내 여행", "해외 여행"]) {
    await page.getByText(t, { exact: true }).click();
  }
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("나는 나 자신, 일상, 일/학교").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "마이크 연결" }).click();
  await page.getByRole("button", { name: "녹음 테스트" }).click();
  await page.getByText("받아쓴 내용").waitFor();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "건너뛰기" }).click();
  await page.getByRole("button", { name: "시험 시작" }).click();
}

/** Answers every question; calls `onQuestion` with the question number before answering it. */
async function answerAll(page: Page, onQuestion?: (n: number) => Promise<void>) {
  for (let n = 1; n <= 16; n++) {
    const play = page.getByRole("button", { name: "질문 듣기" });
    const adjust = page.getByText("난이도 재조정");
    const finished = page.getByText(/시험이 끝났습니다|평가가 끝났습니다|실제 OPIc 등급이 있나요/);
    await expect(play.or(adjust).or(finished).first()).toBeVisible();
    if (await finished.first().isVisible()) return;
    if (await adjust.isVisible()) {
      await page.getByText("비슷한 질문").click();
      await page.getByRole("button", { name: "계속" }).click();
      n--;
      continue;
    }
    await onQuestion?.(n);
    await play.click();
    const next = page.getByRole("button", { name: "다음" });
    await expect(next).toBeEnabled({ timeout: 120_000 });
    await page.waitForTimeout(600);
    await next.click();
  }
}

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
});

test("exam completes and shows the report", async ({ page }) => {
  await mockTranscribe(page);
  await reachFirstQuestion(page);
  await answerAll(page);
  await page.getByText("실제 OPIc 등급이 있나요?").waitFor();
  await page.getByRole("button", { name: "IM2", exact: true }).click();
  await page.getByText("평가가 끝났습니다").waitFor();
  await page.getByRole("button", { name: "보고서 보기" }).first().click();
  await expect(page.locator("#grade")).toBeVisible();
  const numbers = page.locator("#answers").getByRole("button", { name: /^\d+$/ });
  await expect(numbers).toHaveCount(15);
  await expect(page.locator("footer").last()).toContainText("로 평가");
});

test("replay is offered for five seconds only once", async ({ page }) => {
  await mockTranscribe(page);
  await reachFirstQuestion(page);
  await page.getByRole("button", { name: "질문 듣기" }).click();
  const replay = page.getByRole("button", { name: /다시 듣기 \d/ });
  await expect(replay).toBeVisible();
  const seconds = Number((await replay.innerText()).match(/\d+/)?.[0]);
  expect(seconds).toBeLessThanOrEqual(5);
  await page.waitForTimeout(5600);
  // No waiting here: the window must already be closed.
  await expect(page.getByRole("button", { name: "다시 듣기", exact: true })).toBeDisabled({ timeout: 300 });

  // The next question: use the replay once, then it is gone.
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "질문 듣기" }).click();
  await page.getByRole("button", { name: /다시 듣기 \d/ }).click();
  await expect(page.getByRole("button", { name: "다시 듣기 사용함" })).toBeVisible();
});

test("fallback notice waits until the test ends", async ({ page }) => {
  // Call 1 is the setup check, so call 3 is the second question's answer.
  await mockTranscribe(page, { fallbackAt: 3 });
  await reachFirstQuestion(page);
  await answerAll(page, async (n) => {
    if (n >= 3) await expect(page.getByText("보조 음성인식으로 받아씁니다")).toHaveCount(0);
  });
  await expect(page.getByText("보조 음성인식으로 받아씁니다")).toHaveCount(1);
});
