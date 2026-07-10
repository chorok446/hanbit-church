import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { login } from "./helpers/account";

/**
 * 찬양팀 참석 체크 왕복: 리더(e2e 관리자) 로그인 → 콘티 확인 → 참석 체크 저장 → 새로고침 후 유지 확인.
 * 콘티·배정은 API 로 준비하고 끝나면 삭제한다(다른 spec 과 데이터 간섭 없음).
 * 실행: pnpm --filter web e2e praise-team.spec.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

async function adminApi(): Promise<{ api: APIRequestContext; headers: { Authorization: string }; adminId: number }> {
  const api = await request.newContext({ baseURL: API_URL });
  const loginRes = await api.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!loginRes.ok()) {
    throw new Error(`e2e 관리자 로그인 실패(${loginRes.status()}) — ${ADMIN_EMAIL} 계정이 시드돼 있어야 합니다.`);
  }
  const { token } = (await loginRes.json()) as { token: string };
  const headers = { Authorization: `Bearer ${token}` };
  const meRes = await api.get("/api/auth/me", { headers });
  const { id: adminId } = (await meRes.json()) as { id: number };
  return { api, headers, adminId };
}

test("리더가 콘티 참석 체크를 저장하면 새로고침 후에도 유지된다", async ({ page }) => {
  const stamp = Date.now();
  const { api, headers, adminId } = await adminApi();
  let setlistId: string | null = null;

  try {
    // 준비: 관리자 자신에게 찬양팀 리더 역할 부여(멱등) → 콘티 생성 → 본인 배정.
    await api.patch(`/api/admin/users/${adminId}/praise`, {
      headers,
      data: { praiseRole: "LEADER", praiseParts: ["LEADER"] },
    });
    const createRes = await api.post("/api/praise/setlists", {
      headers,
      data: {
        title: `E2E 참석 체크 콘티 ${stamp}`,
        worshipDate: "2099-01-03",
        worshipType: "주일 2부 예배",
        serviceTime: "오전 11:00",
        location: "본당",
        status: "CONFIRMED",
        songs: [{ title: "E2E 찬양", key: "G", bpm: 72, type: "praise", links: [] }],
        notices: [],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    setlistId = ((await createRes.json()) as { id: string }).id;
    const assignRes = await api.put(`/api/praise/setlists/${setlistId}/assignments`, {
      headers,
      data: { assignments: [{ userId: adminId, part: "LEADER" }] },
    });
    expect(assignRes.ok()).toBeTruthy();

    // 브라우저: 로그인 → 콘티 상세 → 참석 체크.
    await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    await page.goto(`/praise-team/setlists/${setlistId}`);
    await expect(page.getByText(`E2E 참석 체크 콘티 ${stamp}`)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("(나)")).toBeVisible();

    await page.getByRole("button", { name: "지각", exact: true }).click();
    await page
      .getByPlaceholder("메모 (선택 — 예: 2부 시작 직전 도착 예정)")
      .fill("E2E — 리허설 직후 합류");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText('참석 여부를 "지각"(으)로 저장했습니다.')).toBeVisible({ timeout: 15_000 });

    // 서버 저장 확인 — 새로고침 후에도 파트 배정 목록과 내 체크 폼에 반영돼 있어야 한다.
    await page.reload();
    await expect(page.getByText("(나)")).toBeVisible({ timeout: 30_000 });
    const attendanceCard = page.locator("#attendance");
    await expect(attendanceCard.getByRole("button", { name: "지각", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(attendanceCard.getByPlaceholder("메모 (선택 — 예: 2부 시작 직전 도착 예정)")).toHaveValue(
      "E2E — 리허설 직후 합류",
    );
  } finally {
    if (setlistId) await api.delete(`/api/praise/setlists/${setlistId}`, { headers });
    await api.dispose();
  }
});

test("지난 콘티 복제와 곡 라이브러리로 새 콘티를 채운다", async ({ page }) => {
  const stamp = Date.now();
  const { api, headers, adminId } = await adminApi();
  const uniqueSong = `E2E복제곡-${stamp}`;
  const createdIds: string[] = [];

  try {
    await api.patch(`/api/admin/users/${adminId}/praise`, {
      headers,
      data: { praiseRole: "LEADER", praiseParts: ["LEADER"] },
    });
    // 소스 콘티: 고유 곡 + 공지 포함.
    const sourceRes = await api.post("/api/praise/setlists", {
      headers,
      data: {
        title: `E2E 복제 소스 ${stamp}`,
        worshipDate: "2099-03-07",
        worshipType: "주일 2부 예배",
        status: "CONFIRMED",
        songs: [{ title: uniqueSong, key: "D", bpm: 96, type: "praise", links: [] }],
        notices: [{ title: "복제 확인 공지", body: "리허설 8:30", author: "리더", date: "2099-03-01", pinned: true }],
      },
    });
    const sourceId = ((await sourceRes.json()) as { id: string }).id;
    createdIds.push(sourceId);

    await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    // 1) 지난 콘티에서 복제 → 곡·공지가 폼에 채워진다.
    await page.goto("/praise-team/setlists/new");
    await page.getByLabel("지난 콘티에서 복제").selectOption(sourceId);
    await expect(page.getByText(/의 곡·공지를 불러왔습니다/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel("곡명 *").first()).toHaveValue(uniqueSong);
    await expect(page.getByLabel("공지 제목 *")).toHaveValue("복제 확인 공지");

    // 2) 곡 라이브러리에서 검색해 곡을 추가한다.
    await page.getByRole("button", { name: "곡 불러오기" }).click();
    await page.getByPlaceholder("곡명 검색 (예: 은혜)").fill(uniqueSong);
    await page.getByRole("button", { name: new RegExp(uniqueSong) }).click();
    await expect(page.getByText(/을\(를\) 곡 목록에 추가했습니다/)).toBeVisible({ timeout: 15_000 });
    // 두 번째 곡 입력란에 라이브러리 곡이 채워졌다.
    await expect(page.getByLabel("곡명 *").nth(1)).toHaveValue(uniqueSong);

    // 새 콘티로 저장까지 완주.
    await page.getByLabel("콘티 제목 *").fill(`E2E 복제 결과 ${stamp}`);
    await page.getByLabel("예배 날짜 *").fill("2099-03-14");
    await page.getByRole("button", { name: "콘티 등록" }).click();
    await page.waitForURL(/\/praise-team\/setlists\/ps-[^/]+$/, { timeout: 30_000 });
    createdIds.push(page.url().split("/").pop() as string);
    await expect(page.getByText(uniqueSong).first()).toBeVisible({ timeout: 30_000 });
  } finally {
    for (const id of createdIds) await api.delete(`/api/praise/setlists/${id}`, { headers }).catch(() => {});
    await api.dispose();
  }
});
