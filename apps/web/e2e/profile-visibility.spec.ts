import { test, expect, request, type APIRequestContext } from "@playwright/test";

/**
 * 공개 프로필 노출 차단 회귀 가드(#201) — 미승인(pending)·정지 계정은 공개 프로필이 404 로 존재를 숨긴다.
 * 단일 기준(User.isPubliclyVisible)이 승인·정지 두 축을 모두 막는지 계정 수명주기를 따라 확인한다:
 *   가입(pending) → 404 → 승인 → 200 → 정지 → 404 → 해제 → 200.
 * GET /api/users/{id} 는 로그인 회원 전용(SecurityConfig)이고 가시성 판정은 뷰어 무관(admin 바이패스 없음)
 * 이라, 인증된 관리자 컨텍스트로 조회한다. 브라우저 UI 없이 API 레벨로만 — 시드 계정은 e2e 관리자 하나면 된다.
 * 실행: pnpm --filter web e2e profile-visibility.spec.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@hanbit.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

test("미승인·정지 계정의 공개 프로필은 404 로 가려진다", async () => {
  const stamp = Date.now();
  const email = `e2e-visibility-${stamp}@example.com`;

  // 관리자 토큰(Bearer) 컨텍스트와, 쿠키/인증 없는 공개 조회 컨텍스트를 분리한다.
  const admin: APIRequestContext = await request.newContext({ baseURL: API_URL });
  const pub: APIRequestContext = await request.newContext({ baseURL: API_URL });
  try {
    const loginRes = await admin.post("/api/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (!loginRes.ok()) {
      throw new Error(`e2e 관리자 로그인 실패(${loginRes.status()}) — ${ADMIN_EMAIL} 계정이 시드돼 있어야 합니다.`);
    }
    const { token } = (await loginRes.json()) as { token: string };
    const headers = { Authorization: `Bearer ${token}` };

    // 1) 가입(승인제라 pending 으로 접수 — 토큰 미발급). 인증 없는 컨텍스트로 보낸다.
    const signupRes = await pub.post("/api/auth/signup", {
      data: { email, password: "Passw0rd!", name: `가시성${stamp}` },
    });
    expect(signupRes.ok()).toBeTruthy();

    // pending 목록에서 방금 가입한 계정의 id 를 찾는다.
    const pendingRes = await admin.get("/api/admin/users/pending?size=100", { headers });
    expect(pendingRes.ok()).toBeTruthy();
    const pending = (await pendingRes.json()) as { content: Array<{ id: number; email: string }> };
    const userId = pending.content.find((u) => u.email === email)?.id;
    expect(userId, `pending 목록에서 ${email} 을 찾지 못했습니다.`).toBeTruthy();

    // 2) 미승인(pending) 상태: 공개 프로필 404.
    expect((await admin.get(`/api/users/${userId}`, { headers })).status()).toBe(404);

    // 3) 승인 → 공개 프로필 200.
    expect((await admin.patch(`/api/admin/users/${userId}/approve`, { headers })).ok()).toBeTruthy();
    expect((await admin.get(`/api/users/${userId}`, { headers })).status()).toBe(200);

    // 4) 정지(미래 만료) → 공개 프로필 404.
    const until = new Date(stamp + 24 * 60 * 60 * 1000).toISOString();
    const suspendRes = await admin.patch(`/api/admin/users/${userId}/suspension`, {
      headers,
      data: { suspendedUntil: until, reason: "e2e 가시성 검증" },
    });
    expect(suspendRes.ok()).toBeTruthy();
    expect((await admin.get(`/api/users/${userId}`, { headers })).status()).toBe(404);

    // 5) 정지 해제 → 다시 공개 프로필 200(토글 양방향 확인).
    expect(
      (await admin.patch(`/api/admin/users/${userId}/suspension`, { headers, data: { suspendedUntil: null } })).ok(),
    ).toBeTruthy();
    expect((await admin.get(`/api/users/${userId}`, { headers })).status()).toBe(200);
  } finally {
    await admin.dispose();
    await pub.dispose();
  }
});
