import { test, expect, type Page } from "@playwright/test";
import { signup, type Account } from "./helpers/account";

/**
 * 마이페이지 계정 설정(비밀번호 변경·이메일 변경·회원 탈퇴) 시나리오.
 * 파괴적 액션이 실제 인증 흐름(재로그인)까지 반영되는지 검증한다.
 */

const NEW_PASSWORD = "NewPassw0rd!";

async function login(page: Page, account: Pick<Account, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  const submit = page.getByRole("button", { name: "로그인", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "내 계정 메뉴" }).click();
  await page.getByRole("menuitem", { name: "로그아웃" }).click();
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();
}

test("비밀번호를 변경하면 새 비밀번호로만 로그인된다", async ({ page }) => {
  const account = await signup(page, "e2e-pw");

  await page.goto("/mypage?tab=account");
  const section = page.getByRole("region", { name: "비밀번호 변경" });
  await section.getByLabel("현재 비밀번호").fill(account.password);
  await section.getByLabel("새 비밀번호", { exact: true }).fill(NEW_PASSWORD);
  await section.getByLabel("새 비밀번호 확인").fill(NEW_PASSWORD);
  await section.getByRole("button", { name: "비밀번호 변경" }).click();
  // 성공 시 세션 마커 재발급으로 폼이 리마운트되므로 피드백은 toast 로 노출된다.
  // 비밀번호 변경은 BCrypt 2회(현재 확인+새 해시)라 머신 부하 시 5s 를 넘길 수 있다 — 여유 대기.
  await expect(page.getByText("비밀번호가 변경되었습니다.")).toBeVisible({ timeout: 15_000 });

  // 기존 비밀번호는 거부된다
  await logout(page);
  await login(page, account);
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();

  // 새 비밀번호로 로그인된다
  await login(page, { email: account.email, password: NEW_PASSWORD });
  await page.waitForURL("**/feed");
  await expect(page.getByRole("button", { name: "내 계정 메뉴" })).toBeVisible();
});

test("이메일을 변경하면 새 이메일로 로그인된다", async ({ page }) => {
  const account = await signup(page, "e2e-email");
  const newEmail = `changed-${Date.now()}@example.com`;

  await page.goto("/mypage?tab=account");
  const section = page.getByRole("region", { name: "이메일 변경" });
  await section.getByLabel("새 이메일").fill(newEmail);
  await section.getByLabel("현재 비밀번호").fill(account.password);
  await section.getByRole("button", { name: "이메일 변경" }).click();
  await expect(page.getByText("이메일이 변경되었습니다.")).toBeVisible();

  // 새 이메일로 재로그인
  await logout(page);
  await login(page, { email: newEmail, password: account.password });
  await page.waitForURL("**/feed");
  await expect(page.getByRole("button", { name: "내 계정 메뉴" })).toBeVisible();
});

test("확인 문구와 비밀번호를 입력해 탈퇴하면 계정이 삭제된다", async ({ page }) => {
  const account = await signup(page, "e2e-del");

  await page.goto("/mypage?tab=account");
  const section = page.getByRole("region", { name: "위험 영역" });
  // 위험 영역은 접혀 있어 summary 클릭으로 펼친다
  await section.locator("summary").click();
  await section.getByLabel("현재 비밀번호").fill(account.password);
  await section.getByLabel("확인 문구").fill("탈퇴합니다");

  const submit = section.getByRole("button", { name: "계정 탈퇴" });
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "탈퇴" }).click();

  // 홈으로 이동 + 비로그인 상태
  await page.waitForURL(/\/$/);
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();

  // 삭제된 계정으로는 로그인할 수 없다
  await login(page, account);
  await expect(page.getByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeVisible();
});

test("계정 탭 알림 설정에서 유형별 알림을 끄면 새로고침해도 유지된다", async ({ page }) => {
  await signup(page, "e2e-notify");

  await page.goto("/mypage?tab=account");
  const section = page.getByRole("region", { name: "알림 설정" });
  const eventToggle = section.getByRole("switch", { name: "행사 알림" });
  const commentToggle = section.getByRole("switch", { name: "댓글 알림" });
  const likeToggle = section.getByRole("switch", { name: "좋아요 알림" });
  await expect(eventToggle).toHaveAttribute("aria-checked", "true");
  await expect(commentToggle).toHaveAttribute("aria-checked", "true");
  await expect(likeToggle).toHaveAttribute("aria-checked", "true");

  await eventToggle.click();
  await expect(eventToggle).toHaveAttribute("aria-checked", "false");
  await commentToggle.click();
  await expect(commentToggle).toHaveAttribute("aria-checked", "false");

  await page.reload();
  const reloaded = page.getByRole("region", { name: "알림 설정" });
  await expect(reloaded.getByRole("switch", { name: "행사 알림" })).toHaveAttribute("aria-checked", "false");
  await expect(reloaded.getByRole("switch", { name: "댓글 알림" })).toHaveAttribute("aria-checked", "false");
  // 끄지 않은 유형은 켜진 채 유지된다 — 저장 시 다른 설정이 초기화되지 않는다.
  await expect(reloaded.getByRole("switch", { name: "좋아요 알림" })).toHaveAttribute("aria-checked", "true");
});
