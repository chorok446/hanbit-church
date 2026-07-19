import { test, expect, request } from "@playwright/test";
import { login } from "./helpers/account";

/**
 * 곡 라이브러리 모달(setlist-form)의 네이티브 <dialog> 접근성 회귀 가드(#201 a11y).
 * showModal() 로 열리는 top-layer 모달의 포커스 트랩(초기 포커스가 다이얼로그 안)과
 * Esc(cancel) 닫힘을 Playwright 로 확인한다. 새 콘티 폼은 리더 전용이라 관리자에게 LEADER 를 부여한다.
 * 실행: pnpm --filter web e2e praise-library-modal.spec.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

test("곡 라이브러리 모달이 포커스를 가두고 Esc 로 닫힌다", async ({ page }) => {
  // 준비: 관리자에게 찬양팀 리더 역할 부여(멱등) — 새 콘티 폼 접근 게이트(LeaderOnly).
  const api = await request.newContext({ baseURL: API_URL });
  try {
    const loginRes = await api.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!loginRes.ok()) {
      throw new Error(`e2e 관리자 로그인 실패(${loginRes.status()}) — ${ADMIN_EMAIL} 계정이 시드돼 있어야 합니다.`);
    }
    const { token } = (await loginRes.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };
    const { id: adminId } = (await (await api.get("/api/auth/me", { headers })).json()) as { id: number };
    await api.patch(`/api/admin/users/${adminId}/praise`, {
      headers,
      data: { praiseRole: "LEADER", praiseParts: ["LEADER"] },
    });
  } finally {
    await api.dispose();
  }

  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await page.goto("/praise-team/setlists/new");

  const openButton = page.getByRole("button", { name: "곡 불러오기" });
  await expect(openButton).toBeVisible({ timeout: 30_000 });
  await openButton.click();

  const dialog = page.getByRole("dialog", { name: "곡 라이브러리" });
  await expect(dialog).toBeVisible();

  // showModal() 로 초기 포커스가 다이얼로그 안으로 들어간다(top-layer 진입).
  // (Tab 순환 트랩까지는 단언하지 않는다 — Chromium 버전별 편차로 플레이키.)
  const focusInsideAtOpen = await page.evaluate(() => document.activeElement?.closest("dialog") != null);
  expect(focusInsideAtOpen).toBe(true);

  // Esc(cancel) 로 닫힌다 — 브라우저 기본 auto-close 대신 onClose 로 부모 상태까지 정리.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
