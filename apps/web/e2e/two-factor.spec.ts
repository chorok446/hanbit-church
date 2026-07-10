import { test, expect } from "@playwright/test";
import { signup, logout } from "./helpers/account";
import { totpCode } from "./helpers/totp";

/**
 * 2단계 인증 왕복: 계정 탭에서 등록(시크릿 → 코드 활성화) → 로그아웃 →
 * 로그인 시 코드 요구 → 코드 입력으로 로그인 완료 → 해제.
 * 실행: pnpm --filter web e2e two-factor.spec.ts
 */
test("2단계 인증을 켜면 로그인에 코드가 요구되고 해제하면 원래대로 돌아온다", async ({ page }) => {
  const account = await signup(page, "e2e-2fa");

  // 1) 계정 탭 — 2단계 인증 켜기 → 시크릿 확보 → 앱 코드 입력(활성화).
  await page.goto("/mypage?tab=account");
  await page.getByRole("button", { name: "2단계 인증 켜기" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent())?.trim() ?? "";
  expect(secret.length).toBeGreaterThan(10);
  await page.getByLabel("인증 앱 6자리 코드").fill(totpCode(secret));
  await page.getByRole("button", { name: "활성화" }).click();
  await expect(page.getByText("2단계 인증 (사용 중)")).toBeVisible();

  // 2) 로그아웃 후 로그인 — 코드 단계가 나타난다.
  await logout(page);
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: /^로그인/ }).click();
  await expect(page.getByText("6자리 코드를 입력해주세요", { exact: false })).toBeVisible();

  // 틀린 코드 → 오류, 맞는 코드 → 로그인 완료(피드 도착).
  await page.getByLabel("인증 코드").fill("000000");
  await page.getByRole("button", { name: "인증하고 로그인" }).click();
  await expect(page.getByText("코드가 올바르지 않습니다", { exact: false })).toBeVisible();
  await page.getByLabel("인증 코드").fill(totpCode(secret));
  await page.getByRole("button", { name: "인증하고 로그인" }).click();
  await page.waitForURL("**/feed**");

  // 3) 해제 — 비밀번호 확인 후 로그인이 코드 없이 통과.
  await page.goto("/mypage?tab=account");
  await page.getByRole("button", { name: "해제", exact: true }).click();
  await page.getByLabel("2단계 인증 해제용 비밀번호").fill(account.password);
  await page.getByRole("button", { name: "해제 확정" }).click();
  await expect(page.getByText("2단계 인증 (사용 중)")).not.toBeVisible();

  await logout(page);
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: /^로그인/ }).click();
  await page.waitForURL("**/feed**", { waitUntil: "commit" });
});
