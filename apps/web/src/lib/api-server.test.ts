// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGetOrNullWithCookies } from "./api-server";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "hanbit_token" ? { value: "expired-test-access" } : undefined }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("SSR access 만료", () => {
  it("401이면 쿠키 없이 공개 데이터를 한 번 조회한다 (서버에서 refresh 하지 않는다)", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ id: "1" }));
    vi.stubGlobal("fetch", fetch);
    await expect(apiGetOrNullWithCookies("/api/posts/1")).resolves.toEqual({ id: "1" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ cache: "no-store" });
    expect(fetch.mock.calls[1][1].headers).toBeUndefined();
    expect(fetch.mock.calls.every(([url]) => !String(url).includes("/auth/refresh"))).toBe(true);
  });

  it("인증 없이는 보이지 않는 글의 404는 클라이언트 복구를 위해 null로 남긴다", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 })));
    await expect(apiGetOrNullWithCookies("/api/posts/1")).resolves.toBeNull();
  });

  it("인증 전용 API의 401 및 서버 오류를 404로 숨기지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(apiGetOrNullWithCookies("/api/users/1")).rejects.toMatchObject({ status: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(apiGetOrNullWithCookies("/api/posts/1")).rejects.toMatchObject({ status: 503 });
  });
});
