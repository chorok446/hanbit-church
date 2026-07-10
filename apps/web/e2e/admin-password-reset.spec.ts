import { test, expect } from "@playwright/test";
import { signup, login, logout } from "./helpers/account";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

/**
 * 관리자 비밀번호 초기화 전체 여정 — 이메일 인프라 없이 쓰는 계정 복구 경로.
 * 초기화 → 임시 비밀번호 1회 표시 → 임시 로그인 시 변경 안내 → 변경 후 플래그 해제.
 */
test("관리자가 초기화한 임시 비밀번호로 로그인하면 변경 안내가 뜨고 변경하면 사라진다", async ({ page }) => {
  const account = await signup(page, "pwreset");
  await logout(page);

  // 1) 관리자: 회원 관리에서 대상 검색 → 비밀번호 초기화 → 임시 비밀번호 1회 표시.
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/admin/users");
  const search = page.getByRole("textbox", { name: "회원 검색" });
  await search.fill(account.email);
  await search.press("Enter");
  const row = page.locator("li", { hasText: account.email });
  await expect(row).toHaveCount(1);

  await row.getByRole("button", { name: "비밀번호 초기화" }).click();
  await page.getByRole("button", { name: "초기화", exact: true }).click();

  const panel = row.getByRole("status");
  await expect(panel).toContainText("임시 비밀번호");
  const tempPassword = (await panel.locator("code").textContent())?.trim() ?? "";
  expect(tempPassword).toHaveLength(12);
  await logout(page);

  // 2) 기존 비밀번호는 더 이상 통하지 않는다(login 헬퍼는 /feed 대기라 직접 폼 제출).
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();

  // 3) 임시 비밀번호 로그인 → 계정 탭으로 안내 + 변경 배너.
  await page.getByLabel("비밀번호", { exact: true }).fill(tempPassword);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(/\/mypage\?tab=account/);
  await expect(page.getByText("임시 비밀번호를 사용 중입니다.")).toBeVisible();

  // 4) 새 비밀번호로 변경하면 배너가 사라지고 새 비밀번호로 로그인된다.
  const newPassword = "NewPassword2!";
  const changeForm = page.getByRole("region", { name: "비밀번호 변경" });
  await changeForm.getByLabel("현재 비밀번호").fill(tempPassword);
  await changeForm.getByLabel("새 비밀번호", { exact: true }).fill(newPassword);
  await changeForm.getByLabel("새 비밀번호 확인").fill(newPassword);
  await changeForm.getByRole("button", { name: "비밀번호 변경" }).click();
  await expect(page.getByText("비밀번호가 변경되었습니다.")).toBeVisible();
  await expect(page.getByText("임시 비밀번호를 사용 중입니다.")).toHaveCount(0);

  await logout(page);
  await login(page, { email: account.email, password: newPassword });
  await page.waitForURL(/\/feed/);
});
