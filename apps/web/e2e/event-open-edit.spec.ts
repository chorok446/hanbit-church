import { test, expect } from "@playwright/test";
import { signup } from "./helpers/account";
import { dateAfter } from "./helpers/dates";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/** 모집중(open) 행사 편집 — 잠금 필드 비활성 + 안내 배너 + 안내 정보 수정 반영(#113 UI 계약). */
test("모집중 행사는 편집에서 조건이 잠기고 안내 정보만 수정된다", async ({ page }) => {
  await signup(page, "openedit");
  const createRes = await page.request.post(`${API_URL}/api/events`, {
    data: {
      title: `모집중 수정 행사 ${Date.now()}`,
      summary: "요약",
      body: "본문",
      recruitStart: dateAfter(-1),
      recruitEnd: dateAfter(7),
      runStart: dateAfter(10),
      runEnd: dateAfter(12),
      capacity: 10,
      place: "예전 장소",
    },
  });
  expect(createRes.ok()).toBeTruthy();
  const eventId = ((await createRes.json()) as { id: string }).id;
  const openRes = await page.request.put(`${API_URL}/api/events/${eventId}/status`, { data: { status: "open" } });
  expect(openRes.ok()).toBeTruthy();

  await page.goto(`/events/${eventId}/edit`);
  // 잠금 안내 배너 + 조건 필드 비활성.
  await expect(page.getByText("모집중에는 제목·모집/진행 기간·정원을 변경할 수 없어요.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("제목", { exact: false })).toBeDisabled();
  await expect(page.getByLabel(/모집 인원/)).toBeDisabled();

  // 안내 정보(장소)는 수정 가능 — 저장 후 상세에 반영.
  const place = page.getByLabel("장소", { exact: false });
  await expect(place).toBeEnabled();
  await place.fill("본당 2층으로 이동");
  await page.getByRole("button", { name: "변경사항 저장" }).click();
  await page.waitForURL(`**/events/${eventId}`);
  await expect(page.getByText("본당 2층으로 이동")).toBeVisible();
});
