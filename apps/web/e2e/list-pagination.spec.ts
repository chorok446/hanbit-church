import { test, expect, request, type APIRequestContext } from "@playwright/test";

/**
 * 목록 엔드포인트 계약 회귀 가드(#205 페이지네이션 전환, #202 창 한정 조회).
 * /api/posts·/api/events 가 page 객체({content,page,size,totalElements,totalPages})를 돌려주는지와
 * size 경계 검증(1..50)을, 그리고 /api/events/upcoming 이 과거 1년 창 안 행사만 주는지 API 레벨로 확인한다.
 * 공개 GET 이라 로그인·시드 계정이 필요 없어 플레이키가 적고 빠르다.
 * 실행: pnpm --filter web e2e list-pagination.spec.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number };

let api: APIRequestContext;
test.beforeAll(async () => {
  api = await request.newContext({ baseURL: API_URL });
});
test.afterAll(async () => {
  await api.dispose();
});

/** page 객체 공통 계약 — 슬라이스 길이·에코된 page/size·정합적 totalPages. */
function expectPageContract(body: Page<unknown>, page: number, size: number) {
  expect(Array.isArray(body.content)).toBe(true);
  expect(body.content.length).toBeLessThanOrEqual(size);
  expect(body.page).toBe(page);
  expect(body.size).toBe(size);
  expect(Number.isInteger(body.totalElements)).toBe(true);
  expect(body.totalElements).toBeGreaterThanOrEqual(0);
  // totalPages 는 totalElements/size 의 올림과 일치해야 한다.
  expect(body.totalPages).toBe(Math.ceil(body.totalElements / size));
}

for (const path of ["/api/posts", "/api/events"]) {
  test(`${path} 가 page 객체 계약과 페이지 경계를 지킨다`, async () => {
    const first = await api.get(`${path}?page=0&size=2`);
    expect(first.ok()).toBeTruthy();
    const firstBody = (await first.json()) as Page<{ id: string }>;
    expectPageContract(firstBody, 0, 2);

    // 시드가 2건을 넘으면(항상 넘는다) 첫 페이지는 꽉 차고 다음 페이지가 존재하며 항목이 겹치지 않는다.
    if (firstBody.totalElements > 2) {
      expect(firstBody.content.length).toBe(2);
      expect(firstBody.totalPages).toBeGreaterThan(1);

      const second = await api.get(`${path}?page=1&size=2`);
      expect(second.ok()).toBeTruthy();
      const secondBody = (await second.json()) as Page<{ id: string }>;
      expectPageContract(secondBody, 1, 2);

      const firstIds = new Set(firstBody.content.map((it) => it.id));
      for (const it of secondBody.content) expect(firstIds.has(it.id)).toBe(false);
    }

    // 범위를 벗어난 page 는 200 + 빈 슬라이스이되 요청한 page/size 를 그대로 에코한다.
    const beyond = await api.get(`${path}?page=9999&size=2`);
    expect(beyond.ok()).toBeTruthy();
    const beyondBody = (await beyond.json()) as Page<unknown>;
    expect(beyondBody.content).toEqual([]);
    expect(beyondBody.page).toBe(9999);
    expect(beyondBody.size).toBe(2);
  });

  test(`${path} 가 size 경계(1..50)를 벗어나면 400 이다`, async () => {
    expect((await api.get(`${path}?size=0`)).status()).toBe(400);
    expect((await api.get(`${path}?size=51`)).status()).toBe(400);
    expect((await api.get(`${path}?page=-1`)).status()).toBe(400);
  });
}

test("/api/events/upcoming 은 과거 1년 창 안 행사만 반환한다", async () => {
  const res = await api.get("/api/events/upcoming");
  expect(res.ok()).toBeTruthy();
  const events = (await res.json()) as Array<{ id: string; runEnd: string }>;
  expect(Array.isArray(events)).toBe(true);

  // 창 한정: 모든 항목의 진행 종료일이 기준일(오늘−1년) 이후여야 한다(과거 무한 적재 방지).
  const horizon = new Date();
  horizon.setFullYear(horizon.getFullYear() - 1);
  const horizonDate = horizon.toISOString().slice(0, 10);
  for (const ev of events) {
    expect(ev.runEnd >= horizonDate).toBeTruthy();
  }
});
