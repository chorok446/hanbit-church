import { test, expect } from "@playwright/test";

/** 모바일 viewport에서 하단 탭 내비가 핵심 페이지로 이동하는지 확인한다. */
test("모바일 하단 탭으로 교제와 행사에 이동할 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // URL 검증이 목적이므로 "load" 대신 "commit" 까지만 기다린다 — 로컬 병렬 실행 부하에서
  // 페이지 로드 완료 대기가 60s 를 넘겨 플레이크가 됐던 스펙.
  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "교제", exact: true }).click();
  await page.waitForURL("**/feed", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/feed/);

  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "행사", exact: true }).click();
  await page.waitForURL("**/events", { waitUntil: "commit" });
  await expect(page).toHaveURL(/\/events/);
});
