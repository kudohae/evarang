import { expect, test, type Page } from "@playwright/test";
import { blockFonts, connectMic, mockFeedback, mockTranscribe } from "./fixtures";

const STORY = {
  id: "storyseed01",
  createdAt: 1000,
  title: "부산 여행",
  topicIds: ["domestic_travel"],
  memo: "부산에 갔다",
  level: "IM3",
  modelId: "gemini-3.8-flash",
  story: "Last summer I went to Busan with two friends. We swam at Haeundae and ate fresh fish at the market.",
  outline: [
    { part: "opening", text: "Last summer I went to Busan with two friends." },
    { part: "closing", text: "It was the best trip ever." },
  ],
  reusable_for: ["domestic_travel", "beach"],
  expressions: [{ en: "It was a blast.", ko: "정말 즐거웠다." }],
  tips: ["다른 여행 질문에도 장소만 바꿔 쓰세요."],
  practice: [],
};

async function seedStory(page: Page) {
  await page.goto("/stories");
  await page.getByRole("heading", { name: "스토리뱅크" }).waitFor();
  await page.evaluate(
    (doc) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open("evarang");
        req.onsuccess = () => {
          const tx = req.result.transaction("docs", "readwrite");
          tx.objectStore("docs").put({ kind: "story", id: doc.id, updatedAt: 1000, data: doc }, `story:${doc.id}`);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
    STORY,
  );
}

test.beforeEach(async ({ page }) => {
  await blockFonts(page);
  await mockFeedback(page);
  await mockTranscribe(page);
});

test("creating stories needs an account", async ({ page }) => {
  await page.goto("/stories");
  await expect(page.getByText("회원 기능이 설정되지 않아 이야기를 만들 수 없습니다.")).toBeVisible();
});

test("a story shows its parts and can be practised", async ({ page }) => {
  await seedStory(page);
  await page.reload();
  await page.getByRole("link", { name: /부산 여행/ }).click();
  await expect(page.getByRole("heading", { name: "부산 여행" })).toBeVisible();
  await expect(page.getByText("It was a blast.")).toBeVisible();
  await expect(page.getByText("바로 답하기")).toBeVisible();

  await page.getByRole("button", { name: "고치기" }).click();
  await page.getByRole("textbox", { name: "이야기 고치기" }).fill("Last summer I went to Busan with my sister.");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("with my sister.")).toBeVisible();

  await page.getByRole("button", { name: "해변 가기", exact: true }).click();
  await connectMic(page);
  await page.getByRole("button", { name: "질문 듣기" }).click();
  const next = page.getByRole("button", { name: "다음" });
  await expect(next).toBeEnabled({ timeout: 120_000 });
  await page.waitForTimeout(600);
  await next.click();
  await expect(page.getByRole("button", { name: "다른 주제로 연습" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "다른 주제로 연습" }).click();
  await expect(page.getByText("지난 연습 1번")).toBeVisible();
  await page.reload();
  await expect(page.getByText("with my sister.")).toBeVisible();
  await expect(page.getByText("지난 연습 1번")).toBeVisible();
});
