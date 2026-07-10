import { test, expect } from "@playwright/test";
import { login } from "./helpers/account";

/**
 * 관리자 수동 일정 왕복: 관리자 로그인 → /admin/calendar 등록 → 목록 확인 →
 * 공개 캘린더(/events?view=calendar 데이터 소스인 GET /api/calendar) 노출 확인 → 삭제.
 * 실행: pnpm --filter web e2e admin-calendar.spec.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@cheolma.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

test("관리자가 수동 일정을 등록하면 공개 캘린더 API 에 노출되고 삭제할 수 있다", async ({ page }) => {
  const stamp = Date.now();
  const title = `E2E 절기 일정 ${stamp}`;

  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/admin/calendar");

  // 등록 — 내일 하루 일정.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateKey = tomorrow.toISOString().slice(0, 10);
  await page.getByLabel("제목 (필수)").fill(title);
  await page.getByLabel("시작일 (필수)").fill(dateKey);
  await page.getByLabel("장소 (선택)").fill("본당");
  await page.getByRole("button", { name: "일정 등록" }).click();
  await expect(page.getByText(title)).toBeVisible();

  // 공개 API 노출 확인 — 캘린더·홈 주간 일정의 데이터 소스.
  const publicList = await page.request.get(`${API_URL}/api/calendar`);
  expect(publicList.ok()).toBeTruthy();
  const items = (await publicList.json()) as Array<{ title: string }>;
  expect(items.some((item) => item.title === title)).toBeTruthy();

  // 삭제 후 목록에서 사라진다 — 삭제 성공 시 목록을 다시 불러오므로(refetch) 병렬 부하에서는
  // 갱신에 수 초가 걸릴 수 있어 여유 있게 기다린다.
  const row = page.locator("li", { hasText: title });
  await row.getByRole("button", { name: "삭제" }).click();
  await expect(page.getByText(title)).not.toBeVisible({ timeout: 15_000 });
});
