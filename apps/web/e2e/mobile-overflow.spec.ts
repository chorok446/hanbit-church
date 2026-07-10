import { test, expect, type Page } from "@playwright/test";
import { login, signup } from "./helpers/account";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

/**
 * 모바일(390px)에서 가로 오버플로(body 가로 스크롤) 회귀 가드.
 * 넓은 요소 하나(긴 코드·버튼 행·테이블)가 끼어들면 페이지 전체가 좌우로 흔들리는데,
 * 눈으로는 놓치기 쉬워 스모크로 고정한다.
 */

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/worship",
  "/welcome",
  "/giving",
  "/news",
  "/sermons",
  "/events",
  "/feed",
  "/search",
  "/login",
  "/signup",
];

async function expectNoHorizontalOverflow(page: Page, path: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${path} 가로 오버플로 ${overflow}px`).toBeLessThanOrEqual(0);
}

test("모바일 390px 에서 공개 페이지에 가로 스크롤이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page, path);
  }
});

test("모바일 390px 에서 마이페이지 탭(계정·접속 기록)에 가로 스크롤이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signup(page, "e2e-mobile");
  for (const path of ["/mypage", "/mypage?tab=account", "/mypage?tab=access", "/notifications"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page, path);
  }
});

test("모바일 390px 에서 관리자 페이지에 가로 스크롤이 없다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  // 회원 관리 행(역할 셀렉트·정지·2FA 해제·비밀번호 초기화 버튼)과 콘텐츠 일괄 바가 가장 오버플로 위험.
  for (const path of ["/admin", "/admin/users", "/admin/content", "/admin/reports", "/admin/approvals", "/admin/logs"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page, path);
  }
});
