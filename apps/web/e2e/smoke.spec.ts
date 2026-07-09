import { test, expect } from "@playwright/test";
import { signup } from "./helpers/account";
import { fillPostContent } from "./helpers/post-content";

/**
 * 핵심 경로 스모크: 회원가입(승인제) → 글 작성 → 피드 노출 → 로그인 상태로 직접 진입.
 * 마지막 단계는 hydration 첫 렌더에서 비로그인 UI로 튕기던 회귀(#197, #198)의 가드다.
 */
test("회원가입 후 글을 작성하면 피드에 보인다", async ({ page }) => {
  const stamp = Date.now();

  // 회원가입(가입 신청 → 관리자 승인 → 로그인까지 헬퍼가 처리)
  const { nickname } = await signup(page, "e2e");

  // 헤더에 로그인 상태 반영 — 프로필 드롭다운 버튼 노출
  await expect(page.getByRole("button", { name: "내 계정 메뉴" })).toBeVisible();

  // 글 작성
  const text = `E2E 스모크 게시글 ${stamp}`;
  await page.goto("/posts/new");
  await fillPostContent(page, text);
  await page.getByRole("button", { name: "게시하기" }).click();
  await page.waitForURL("**/feed");
  await expect(page.getByText(text).first()).toBeVisible();

  // 로그인 상태로 마이페이지 직접 진입 — 비로그인 안내가 뜨면 hydration 회귀
  await page.goto("/mypage");
  await expect(page.getByText(nickname).first()).toBeVisible();
  await expect(page.getByText("마이페이지를 보려면 로그인이 필요합니다.")).toHaveCount(0);
});
