import { test, expect } from "@playwright/test";
import { login, signup } from "./helpers/account";
import { fillPostContent } from "./helpers/post-content";

/**
 * 관리자 콘텐츠 관리 왕복: 일반 회원이 글 작성 → 관리자가 /admin/content 에서 숨김(사유 포함)
 * → 공개 교제 목록에서 사라짐 → 복구.
 * 실행: pnpm --filter web e2e admin-content.spec.ts
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

test("관리자가 게시글을 숨기면 공개 목록에서 빠지고 복구하면 되살아난다", async ({ page }) => {
  const stamp = Date.now();
  const text = `E2E 숨김 대상 글 ${stamp}`;

  // 일반 회원이 나눔 글 작성.
  await signup(page, "e2e-content");
  await page.goto("/posts/new");
  await fillPostContent(page, text);
  await page.getByRole("button", { name: "게시하기" }).click();
  await page.waitForURL("**/feed**");
  await expect(page.getByText(text)).toBeVisible();

  // 관리자 로그인 → 콘텐츠 관리에서 숨김.
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/admin/content");
  const row = page.locator("li", { hasText: text });
  await row.getByRole("button", { name: "숨김", exact: true }).click();
  await row.getByPlaceholder(/숨김 사유/).fill("e2e 검증용 숨김");
  await row.getByRole("button", { name: "숨김 확정" }).click();
  await expect(row.getByText("숨김", { exact: true })).toBeVisible();

  // 공개 교제 목록에서 빠진다.
  await page.goto("/feed");
  await expect(page.getByText(text)).not.toBeVisible();

  // 복구하면 숨김 배지가 사라진다.
  await page.goto("/admin/content");
  const hiddenRow = page.locator("li", { hasText: text });
  await hiddenRow.getByRole("button", { name: "복구" }).click();
  await expect(hiddenRow.getByRole("button", { name: "숨김", exact: true })).toBeVisible();
});

test("관리자가 여러 글을 선택해 일괄 숨김·복구한다", async ({ page }) => {
  const stamp = Date.now();
  const first = `E2E 일괄 대상 A ${stamp}`;
  const second = `E2E 일괄 대상 B ${stamp}`;

  await signup(page, "e2e-bulk");
  for (const text of [first, second]) {
    await page.goto("/posts/new");
    await fillPostContent(page, text);
    await page.getByRole("button", { name: "게시하기" }).click();
    await page.waitForURL("**/feed**");
  }

  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/admin/content");
  const rowFor = (text: string) => page.locator("li", { hasText: text });
  await rowFor(first).getByRole("checkbox").check();
  await rowFor(second).getByRole("checkbox").check();
  await expect(page.getByText("2건 선택됨")).toBeVisible();
  await page.getByLabel("일괄 숨김 사유").fill("e2e 일괄 정리");
  await page.getByRole("button", { name: "선택 숨김" }).click();
  await expect(page.getByText("2건을 숨김 처리했습니다.")).toBeVisible();

  const rowA = page.locator("li", { hasText: first });
  const rowB = page.locator("li", { hasText: second });
  await expect(rowA.getByText("숨김", { exact: true })).toBeVisible();
  await expect(rowB.getByText("숨김", { exact: true })).toBeVisible();

  // 일괄 복구.
  await rowFor(first).getByRole("checkbox").check();
  await rowFor(second).getByRole("checkbox").check();
  await page.getByRole("button", { name: "선택 복구" }).click();
  await expect(page.getByText("2건을 복구 처리했습니다.")).toBeVisible();
  await expect(rowA.getByRole("button", { name: "숨김", exact: true })).toBeVisible();
  await expect(rowB.getByRole("button", { name: "숨김", exact: true })).toBeVisible();
});
