import { test, expect } from "@playwright/test";
import { signup, login, logout } from "./helpers/account";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

/**
 * 사용자 검색은 회원 관리 권한자(관리자) 전용 — 전체 회원 열거 차단 정책.
 * 일반 회원에게는 사용자 탭이 노출되지 않고, 관리자는 닉네임 검색 → 프로필 이동이 동작한다.
 */
test("사용자 탭은 관리자에게만 보이고 관리자는 닉네임으로 사용자를 찾는다", async ({ page }) => {
  // 1) 일반 회원: 사용자 탭 자체가 노출되지 않는다.
  const account = await signup(page, "usr");
  await page.goto("/search");
  await expect(page.getByRole("button", { name: "게시글", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "사용자", exact: true })).toHaveCount(0);
  await logout(page);

  // 2) 관리자: 사용자 탭 검색 → 방금 가입한 회원을 찾아 프로필로 이동.
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/search");
  await page.getByRole("button", { name: "사용자", exact: true }).click();
  await page.waitForURL(/type=users/);
  await expect(page.getByText("이름으로 사용자를 찾아보세요.")).toBeVisible();

  const searchInput = page.getByRole("textbox", { name: "통합 검색" });
  await searchInput.fill(account.nickname);
  await searchInput.press("Enter");
  await page.waitForURL(/type=users/);

  const result = page.getByRole("link", { name: new RegExp(account.nickname) });
  await expect(result).toBeVisible();
  await result.click();
  await page.waitForURL(/\/users\/\d+/);
  await expect(page.getByText(account.nickname).first()).toBeVisible();
});
