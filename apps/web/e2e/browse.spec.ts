import { test, expect } from "@playwright/test";

/** 피드 URL canonical 정규화 — useCanonicalUrl + buildFeedHref 회귀 가드. */
test("피드 진입 시 URL이 canonical 형태로 정규화된다", async ({ page }) => {
  await page.goto("/feed");
  await page.waitForURL(/\/feed\?sort=latest&page=0$/);
});

test("잘못된 page 파라미터를 canonical URL로 교정한다", async ({ page }) => {
  await page.goto("/feed?page=-1&sort=popular");
  await page.waitForURL(/\/feed\?sort=popular&page=0$/);
});

/** 공개 상세 페이지 스모크 — PageShell 마이그레이션 후 렌더 회귀 가드. */
test("시드 게시글 상세를 열 수 있다", async ({ page }) => {
  await page.goto("/posts/p1");

  // p1 은 공지(NOTICE) 시드 — 카테고리별 돌아가기 버튼은 소식으로 향한다.
  await expect(page.getByRole("button", { name: "소식으로 돌아가기" })).toBeVisible();
  await expect(page.getByText("여름 청년 수련회 사전 모임").first()).toBeVisible();
});

test("시드 행사 상세를 열 수 있다", async ({ page }) => {
  await page.goto("/campaigns/c1");

  await expect(page.getByRole("heading", { name: "여름 청년 수련회" })).toBeVisible();
  await expect(page.getByRole("button", { name: "행사 목록" })).toBeVisible();
});

test("행사 목록 URL이 canonical 형태로 정규화된다", async ({ page }) => {
  await page.goto("/campaigns?page=-1&sort=popular");
  await page.waitForURL(/\/campaigns\?sort=popular&page=0$/);
});

test("행사 목록 정렬이 URL에 반영된다", async ({ page }) => {
  await page.goto("/campaigns");
  // canonical 정규화(?sort=latest&page=0 replace)가 끝난 뒤 선택해야 정렬 변경이 덮어써지지 않는다.
  await page.waitForURL(/\/campaigns\?sort=latest&page=0$/);

  await page.locator("select").filter({ has: page.locator('option[value="popular"]') }).selectOption("popular");
  await page.waitForURL(/sort=popular/);
});
