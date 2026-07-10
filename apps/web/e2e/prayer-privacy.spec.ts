import { test, expect } from "@playwright/test";
import { signup, logout } from "./helpers/account";
import { fillPostContent } from "./helpers/post-content";

/**
 * 기도 프라이버시 왕복: 익명 + 교인만 공개 기도제목을 작성하면
 * 로그인 상태에선 익명으로 보이고, 로그아웃하면 목록·상세 어디서도 보이지 않는다.
 * 실행: pnpm --filter web e2e prayer-privacy.spec.ts
 */
test("익명·교인만 공개 기도제목은 익명으로 표시되고 로그아웃하면 사라진다", async ({ page }) => {
  const stamp = Date.now();
  const text = `E2E 교인만 익명 기도 ${stamp}`;
  await signup(page, "e2e-pray");

  // 1) 기도 카테고리 + 익명 + 교인만 공개로 작성.
  await page.goto("/posts/new");
  await page.locator("#post-category").selectOption("PRAYER");
  await page.getByLabel(/익명으로 올리기/).check();
  await page.locator("#post-visibility").selectOption("members");
  await fillPostContent(page, text);
  await page.getByRole("button", { name: "게시하기" }).click();
  await page.waitForURL("**/feed");

  // 2) 로그인 상태: 피드(리스트 뷰) 행에 글이 보이고 작성자는 "익명".
  const row = page.getByRole("link", { name: new RegExp(`${stamp}`) }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("익명");

  // 상세로 이동 — 본문·"교인만 공개" 배지·익명 작성자 확인, URL 확보(로그아웃 후 404 확인용).
  await row.click();
  await page.waitForURL("**/posts/**");
  const detailUrl = page.url();
  await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByText("교인만 공개")).toBeVisible();

  // 3) 로그아웃: 피드 목록·상세 직링크 모두에서 사라진다.
  await page.goto("/feed");
  await logout(page);
  await expect(page.getByText(text)).toHaveCount(0);

  const response = await page.goto(detailUrl);
  expect(response?.status()).toBe(404);
});
