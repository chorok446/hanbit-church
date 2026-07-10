import { test, expect, request as playwrightRequest } from "@playwright/test";
import { signup } from "./helpers/account";

test("접속 기록 탭에 가입·로그인 후 기록이 표시된다", async ({ page }) => {
  await signup(page, "e2e-access");

  await page.goto("/mypage?tab=access");
  await expect(page.getByText("최근 1년간 로그인·세션 갱신 시점의 OS와 IP를 보여줘요.")).toBeVisible();
  await expect(page.getByText("아직 접속 기록이 없어요.")).not.toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

test("다른 기기 세션을 접속 기록에서 원격 로그아웃한다", async ({ page }) => {
  const account = await signup(page, "e2e-remote");

  // 별도 쿠키 저장소로 두 번째 로그인 = 다른 기기 세션.
  const otherDevice = await playwrightRequest.newContext({ baseURL: API_URL });
  const loginRes = await otherDevice.post("/api/auth/login", {
    data: { email: account.email, password: account.password },
  });
  expect(loginRes.ok()).toBeTruthy();
  expect((await otherDevice.get("/api/auth/me")).ok()).toBeTruthy();

  // 접속 기록에서 그 세션(비현재)을 로그아웃한다.
  await page.goto("/mypage?tab=access");
  const revokeButton = page.getByRole("button", { name: "세션 로그아웃" }).first();
  await expect(revokeButton).toBeVisible();
  await revokeButton.click();
  await page.getByRole("button", { name: "세션 로그아웃", exact: true }).last().click(); // 확인 다이얼로그
  await expect(page.getByText("로그아웃됨").first()).toBeVisible();

  // 다른 기기 세션은 즉시 무효 — access 401, refresh 재발급도 불가.
  await expect.poll(async () => (await otherDevice.get("/api/auth/me")).status()).toBe(401);
  expect((await otherDevice.post("/api/auth/refresh")).status()).toBe(401);
  await otherDevice.dispose();

  // 내(현재) 세션은 그대로 살아 있다.
  await page.reload();
  await expect(page.getByText("현재 세션").first()).toBeVisible();
});

test("다른 세션 모두 로그아웃은 현재 세션만 남긴다", async ({ page }) => {
  const account = await signup(page, "e2e-revokeall");

  const deviceB = await playwrightRequest.newContext({ baseURL: API_URL });
  const deviceC = await playwrightRequest.newContext({ baseURL: API_URL });
  for (const device of [deviceB, deviceC]) {
    const res = await device.post("/api/auth/login", {
      data: { email: account.email, password: account.password },
    });
    expect(res.ok()).toBeTruthy();
  }

  await page.goto("/mypage?tab=access");
  await page.getByRole("button", { name: "다른 세션 모두 로그아웃" }).click();
  await page.getByRole("button", { name: "모두 로그아웃", exact: true }).click();
  await expect(page.getByText(/개 세션을 로그아웃했습니다/)).toBeVisible();

  await expect.poll(async () => (await deviceB.get("/api/auth/me")).status()).toBe(401);
  await expect.poll(async () => (await deviceC.get("/api/auth/me")).status()).toBe(401);
  await deviceB.dispose();
  await deviceC.dispose();

  // 현재 세션은 유지 — 목록이 다시 로드되고 현재 세션 배지가 보인다.
  await expect(page.getByText("현재 세션").first()).toBeVisible();
});
