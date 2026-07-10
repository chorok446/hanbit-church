import { type Page, expect, request } from "@playwright/test";

export type Account = { email: string; password: string; nickname: string };

/** API 직접 호출용 베이스 URL — 웹 dev 서버(3000)가 아니라 Spring API(8080)를 가리킨다. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * 가입 승인용 e2e 관리자 계정.
 * 새 환경(로컬 DB 초기화·CI 등)에서는 이 계정을 미리 시드해야 한다:
 * role=ADMIN, 승인 완료 상태(approvedAt 세팅)여야 승인 API 를 호출할 수 있다.
 * 자격은 env(E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD)가 우선, 없으면 아래 기본값.
 */
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@cheolma.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "E2eAdmin1!";

/** 로그인 후 피드로 이동한다. */
export async function login(page: Page, account: Pick<Account, "email" | "password">) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  const submit = page.getByRole("button", { name: "로그인", exact: true });
  await expect(submit).toBeEnabled();
  await submit.click();
  await page.waitForURL("**/feed", { timeout: 60_000 });
}

/** 헤더 프로필 드롭다운을 열고 로그아웃한다. */
export async function logout(page: Page) {
  await page.getByRole("button", { name: "내 계정 메뉴" }).click();
  await page.getByRole("menuitem", { name: "로그아웃" }).click();
  await expect(page.getByRole("button", { name: "내 계정 메뉴" })).toBeHidden({ timeout: 15_000 });
}

// 워커 프로세스당 관리자 토큰 캐시 — 매 signup 마다 로그인하면 auth rate limit(IP당 분당 횟수)을 소모한다.
let cachedAdminToken: string | null = null;

async function adminToken(api: import("@playwright/test").APIRequestContext): Promise<string> {
  if (cachedAdminToken) return cachedAdminToken;
  const loginRes = await api.post("/api/auth/login", {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!loginRes.ok()) {
    throw new Error(
      `e2e 관리자 로그인 실패(${loginRes.status()}) — ${ADMIN_EMAIL} 계정(ADMIN·승인됨)이 DB에 시드돼 있어야 합니다.`,
    );
  }
  const { token } = (await loginRes.json()) as { token: string };
  cachedAdminToken = token;
  return token;
}

/**
 * 관리자 API 로 가입 신청을 승인한다.
 * 브라우저 컨텍스트와 쿠키를 공유하지 않도록 별도 request 컨텍스트를 쓴다
 * (page.request 를 쓰면 관리자 로그인 쿠키가 브라우저 세션을 덮어쓴다).
 */
async function approveUser(email: string): Promise<void> {
  const api = await request.newContext({ baseURL: API_URL });
  try {
    const headers = { Authorization: `Bearer ${await adminToken(api)}` };

    const pendingRes = await api.get("/api/admin/users/pending?size=100", { headers });
    if (!pendingRes.ok()) {
      throw new Error(`승인 대기 목록 조회 실패(${pendingRes.status()})`);
    }
    const pending = (await pendingRes.json()) as { content: Array<{ id: number; email: string }> };
    const target = pending.content.find((u) => u.email === email);
    if (!target) {
      throw new Error(`승인 대기 목록에서 ${email} 을 찾지 못했습니다(size=100 초과 누적 가능성).`);
    }

    const approveRes = await api.patch(`/api/admin/users/${target.id}/approve`, { headers });
    if (!approveRes.ok()) {
      throw new Error(`가입 승인 실패(${approveRes.status()}): user ${target.id} (${email})`);
    }
  } finally {
    await api.dispose();
  }
}

/**
 * 회원가입(승인제) 후 로그인까지 마친 계정을 반환한다.
 * 가입 신청 → "가입 신청 완료" 화면 확인 → 관리자 API 로 승인 → UI 로그인 → 피드 도착.
 */
export async function signup(page: Page, prefix = "e2e"): Promise<Account> {
  const stamp = Date.now();
  // 닉네임에 ms 타임스탬프 전체 + 난수를 쓴다 — 예전 % 100000(5자리)은 실행 간 충돌해
  // 닉네임 검색 스펙이 strict mode 위반(동명 사용자 2명)으로 깨졌다. 로컬 DB 는 볼륨에 누적된다.
  const account: Account = {
    email: `${prefix}-${stamp}@example.com`,
    password: "Passw0rd!",
    nickname: `이투이${stamp}${Math.floor(Math.random() * 1000)}`,
  };

  await page.goto("/signup");
  await page.getByLabel("이메일").fill(account.email);
  await page.getByLabel("비밀번호", { exact: true }).fill(account.password);
  await page.getByLabel("비밀번호 확인").fill(account.password);
  await page.getByLabel("이름(실명)").fill(account.nickname);
  const submit = page.getByRole("button", { name: "회원가입" });
  await expect(submit).toBeEnabled();
  await submit.click();

  // 승인제: 토큰이 발급되지 않고 승인 대기 안내가 뜬다.
  await expect(page.getByText("가입 신청이 접수되었습니다")).toBeVisible({ timeout: 30_000 });

  await approveUser(account.email);

  // 승인 후 UI 로그인으로 기존 헬퍼와 동일한 상태(로그인된 세션, 피드)로 마무리.
  await login(page, account);

  return account;
}
