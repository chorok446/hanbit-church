import { test, expect } from "@playwright/test";

/** 모바일 viewport에서 하단 탭 내비가 핵심 페이지로 이동하는지 확인한다.
 *  비로그인 하단 탭은 방문자 우선 구성(홈·예배안내·오시는길·새가족)이다. */
test("모바일 하단 탭으로 예배안내와 새가족에 이동할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // URL 검증이 목적이므로 "load" 대신 "commit" 까지만 기다린다 — 로컬 병렬 실행 부하에서
  // 페이지 로드 완료 대기가 60s 를 넘겨 플레이크가 됐던 스펙.
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "예배안내", exact: true }).click();
  await page.waitForURL("**/worship", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/worship/);

  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "새가족", exact: true }).click();
  await page.waitForURL("**/welcome", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/welcome/);
});

/** 모바일 헤더의 전체 메뉴 시트 — 열기·이동·닫기. */
test("모바일 시트 메뉴로 전체 페이지에 이동할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "전체 메뉴 열기" }).click();
  const sheet = page.getByRole("dialog", { name: "전체 메뉴" });
  await expect(sheet).toBeVisible();

  await sheet.getByRole("link", { name: "주보", exact: true }).click();
  await page.waitForURL("**/bulletin", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/bulletin/);
  await expect(sheet).toBeHidden();
});
