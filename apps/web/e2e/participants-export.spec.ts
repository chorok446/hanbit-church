import { test, expect } from "@playwright/test";
import { signup, login, logout } from "./helpers/account";
import { dateAfter } from "./helpers/dates";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** 개설자가 참가자 관리에서 명단 CSV 를 내려받는다 — 이름·인증만 담기고 이메일은 없다. */
test("행사 개설자는 참가자 명단 CSV 를 내려받는다", async ({ page }) => {
  // 개설자 계정으로 행사 생성(API — 쿠키는 페이지 세션의 httpOnly JWT 를 그대로 쓴다).
  const owner = await signup(page, "csvowner");
  const createRes = await page.request.post(`${API_URL}/api/events`, {
    data: {
      title: `명단 내보내기 행사 ${Date.now()}`,
      summary: "명단 테스트",
      body: "본문",
      recruitStart: dateAfter(-1),
      recruitEnd: dateAfter(7),
      runStart: dateAfter(10),
      runEnd: dateAfter(12),
      capacity: 10,
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const eventId = ((await createRes.json()) as { id: string }).id;
  // 생성 직후 상태는 upcoming — 참여가 가능하도록 개설자가 모집을 시작한다.
  const openRes = await page.request.put(`${API_URL}/api/events/${eventId}/status`, {
    data: { status: "open" },
  });
  expect(openRes.ok()).toBeTruthy();
  await logout(page);

  // 참가자 한 명 참여.
  const member = await signup(page, "csvjoin");
  const joinRes = await page.request.post(`${API_URL}/api/events/${eventId}/join`);
  expect(joinRes.ok()).toBeTruthy();
  await logout(page);

  // 개설자: 참가자 관리 페이지에서 CSV 내보내기.
  await login(page, owner);
  await page.goto(`/events/${eventId}/participants`);
  await expect(page.getByText("참가자 1명")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`participants-${eventId}.csv`);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks).toString("utf-8");
  expect(body).toContain("번호,이름,인증");
  expect(body).toContain(member.nickname);
  // 연락처(이메일)는 내보내기에도 없다 — 회원 열거 차단 정책 유지.
  expect(body).not.toContain("@");
});

test("모집중 행사 정원을 참가자 관리에서 늘릴 수 있다", async ({ page }) => {
  await signup(page, "capinc");
  const createRes = await page.request.post(`${API_URL}/api/events`, {
    data: {
      title: `정원 증원 행사 ${Date.now()}`,
      summary: "s",
      body: "b",
      recruitStart: dateAfter(-1),
      recruitEnd: dateAfter(7),
      runStart: dateAfter(10),
      runEnd: dateAfter(12),
      capacity: 10,
    },
  });
  const eventId = ((await createRes.json()) as { id: string }).id;
  await page.request.put(`${API_URL}/api/events/${eventId}/status`, { data: { status: "open" } });

  await page.goto(`/events/${eventId}/participants`);
  await expect(page.getByText("정원 10명")).toBeVisible();
  await page.getByLabel("정원 늘리기").fill("15");
  await page.getByRole("button", { name: "변경", exact: true }).click();
  await expect(page.getByText("정원 15명")).toBeVisible();
});
