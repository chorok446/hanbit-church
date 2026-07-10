import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signup, login } from "./helpers/account";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

async function expectNoSevereViolations(page: Page) {
  // 카카오맵 SDK 가 생성하는 DOM(<area> 등)은 우리가 제어할 수 없어 제외한다.
  const results = await new AxeBuilder({ page }).exclude("[data-third-party]").analyze();
  const severe = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    severe.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 120)),
    })),
  ).toEqual([]);
}

/**
 * 공개 주요 페이지 접근성 스모크 — axe-core 로 serious/critical 위반 0건을 강제한다.
 * (Lighthouse 수동 측정에서만 잡히던 a11y 회귀를 CI 에서 즉시 잡는다 — 푸터 대비·목록 구조 회귀 전례)
 * 실행: pnpm --filter web e2e a11y.spec.ts
 */
// 시드 상세(p1 게시글·c1 행사) 포함 — 목록만 검사하면 댓글·상호작용 UI 가 사각이 된다.
const PAGES = ["/", "/sermons", "/news", "/events", "/feed", "/login", "/signup", "/about", "/worship", "/welcome", "/giving", "/privacy", "/terms", "/posts/p1", "/events/c1"];

for (const path of PAGES) {
  test(`a11y: ${path} 에 serious/critical 위반이 없다`, async ({ page }) => {
    await page.goto(path);
    // 목록 페이지는 클라이언트 fetch 가 끝나야 실제 콘텐츠가 검사된다.
    await page.waitForLoadState("networkidle");
    await expectNoSevereViolations(page);
  });
}

// 로그인 영역 — 마이페이지(탭 4종은 대표 2곳)·알림. 회원 계정 하나로 순회한다.
test("a11y: 로그인 영역(마이페이지·알림)에 serious/critical 위반이 없다", async ({ page }) => {
  await signup(page, "e2e-a11y");
  for (const path of ["/mypage", "/mypage?tab=account", "/notifications"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSevereViolations(page);
  }
});

// 관리자 영역 — 대시보드·회원 관리(대표 2곳).
test("a11y: 관리자 영역(대시보드·회원 관리)에 serious/critical 위반이 없다", async ({ page }) => {
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  for (const path of ["/admin", "/admin/users"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoSevereViolations(page);
  }
});

/**
 * 다크모드 접근성 스모크 — 대비(color-contrast) 위반은 팔레트별로 달라 라이트 통과가
 * 다크 통과를 보장하지 않는다(--danger-solid 대비 보정 전례). 같은 페이지를 다크로 재검사한다.
 */
for (const path of PAGES) {
  test(`다크모드 접근성: ${path}`, async ({ page }) => {
    // next-themes(attribute=class, 기본 storage key "theme") — 로드 전에 다크로 고정한다.
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoSevereViolations(page);
  });
}

// 로그인·관리자 영역 다크모드 — 공개 다크 스위트(#101)가 실결함을 잡은 전례로 확장.
test("다크모드 a11y: 로그인 영역(마이페이지·알림)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await signup(page, "e2e-a11y-dark");
  for (const path of ["/mypage", "/mypage?tab=account", "/notifications"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoSevereViolations(page);
  }
});

test("다크모드 a11y: 관리자 영역(대시보드·회원 관리)", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  for (const path of ["/admin", "/admin/users"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expectNoSevereViolations(page);
  }
});

// 찬양팀 영역 — 멤버 전용이라 공개 스위트가 못 덮는다. 관리자에게 리더 역할을 부여(멱등)해 순회하고,
// 콘티 상세(참석 체크·배정 UI)는 API 로 콘티를 만들어 검사한 뒤 정리한다.
for (const dark of [false, true]) {
  test(`a11y: 찬양팀 영역 (${dark ? "다크" : "라이트"})`, async ({ page, request }) => {
    const api = request;
    const loginRes = await api.post("http://localhost:8080/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const { token } = (await loginRes.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };
    const meRes = await api.get("http://localhost:8080/api/auth/me", { headers });
    const { id } = (await meRes.json()) as { id: number };
    await api.patch(`http://localhost:8080/api/admin/users/${id}/praise`, {
      headers,
      data: { praiseRole: "LEADER", praiseParts: ["LEADER"] },
    });
    const createRes = await api.post("http://localhost:8080/api/praise/setlists", {
      headers,
      data: {
        worshipDate: "2099-12-26",
        worshipType: "주일 오전",
        title: `a11y 검사용 콘티 ${Date.now()}`,
        songs: [{ title: "a11y 찬양", key: "G", bpm: 72, type: "praise", links: [] }],
      },
    });
    const { id: setlistId } = (await createRes.json()) as { id: string };

    try {
      if (dark) await page.addInitScript(() => localStorage.setItem("theme", "dark"));
      await login(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      const paths = [
        "/praise-team",
        "/praise-team/schedule",
        "/praise-team/setlists",
        "/praise-team/members",
        `/praise-team/setlists/${setlistId}`,
      ];
      for (const path of paths) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        // 404 폴백 위에서 axe 가 통과해버리는 헛검사 방지 — 찬양팀 셸 헤더가 실제로 렌더됐는지 확인.
        await expect(page.getByText("찬양팀").first()).toBeVisible();
        await expectNoSevereViolations(page);
      }
    } finally {
      await api.delete(`http://localhost:8080/api/praise/setlists/${setlistId}`, { headers });
    }
  });
}
