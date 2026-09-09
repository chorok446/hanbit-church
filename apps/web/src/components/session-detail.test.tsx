import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiGetOrNull } from "@/lib/api";
import { clearSession, setSession } from "@/lib/auth";
import { SessionDetail } from "./session-detail";

const response = (status: number, body: unknown = {}) => Response.json(body, { status });
const load = () => apiGetOrNull<{ text: string }>("/api/posts/1");
function Detail() {
  return <SessionDetail identity="post:1" load={load} fallback={<p>찾을 수 없음</p>}>
    {(data) => <h1>{data.text}</h1>}
  </SessionDetail>;
}

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("인증 상세 복구", () => {
  it("access 쿠키가 없어 상세 GET이 404여도 /me → refresh 후 상세를 복구한다", async () => {
    setSession("테스트 교인");
    let authenticated = false;
    const fetch = vi.fn(async (input: string) => {
      if (input.endsWith("/auth/refresh")) { authenticated = true; return response(200); }
      if (input.endsWith("/auth/me")) return response(authenticated ? 200 : 401);
      return response(authenticated ? 200 : 404, { text: "교인 전용 기도" });
    });
    vi.stubGlobal("fetch", fetch);
    render(<Detail />);
    expect(await screen.findByRole("heading", { name: "교인 전용 기도" })).toBeTruthy();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("서버에 API 호스트 쿠키가 없어도 브라우저 인증으로 복구한다", async () => {
    setSession("테스트 교인");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => response(200, url.endsWith("/auth/me") ? {} : { text: "숨긴 행사" })));
    render(<Detail />);
    expect(await screen.findByRole("heading", { name: "숨긴 행사" })).toBeTruthy();
  });

  it("비로그인에게는 인증 요청 없이 같은 찾을 수 없음 화면을 보인다", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<Detail />);
    expect(screen.getByText("찾을 수 없음")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refresh가 거부되면 재귀 없이 세션을 정리한다", async () => {
    setSession("테스트 교인");
    const fetch = vi.fn(async () => response(401));
    vi.stubGlobal("fetch", fetch);
    render(<Detail />);
    expect(await screen.findByText("찾을 수 없음")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("인증 후에도 404이면 상세를 노출하지 않는다", async () => {
    setSession("테스트 교인");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => response(url.endsWith("/auth/me") ? 200 : 404)));
    render(<Detail />);
    expect(await screen.findByText("찾을 수 없음")).toBeTruthy();
  });

  it("로그인 안내와 인증 후 실제 404 안내를 구분할 수 있다", async () => {
    setSession("테스트 교인");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => response(url.endsWith("/auth/me") ? 200 : 404)));
    render(<SessionDetail identity="post:1" load={load} fallback={<p>로그인 필요</p>} notFoundFallback={<p>실제 404</p>}>
      {(data) => <h1>{data.text}</h1>}
    </SessionDetail>);
    expect(await screen.findByText("실제 404")).toBeTruthy();
    expect(screen.queryByText("로그인 필요")).toBeNull();
  });

  it("일시 오류는 로그아웃/404로 바꾸지 않고 재시도할 수 있다", async () => {
    setSession("테스트 교인");
    let failed = true;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/auth/me") ? response(200) : response(failed ? 503 : 200, { text: "복구 완료" })));
    render(<Detail />);
    const retry = await screen.findByRole("button", { name: "다시 시도" });
    failed = false;
    fireEvent.click(retry);
    expect(await screen.findByRole("heading", { name: "복구 완료" })).toBeTruthy();
  });

  it("로그아웃 즉시 내용이 사라지고 늦은 이전 계정 응답도 무시한다", async () => {
    setSession("이전 교인");
    let resolve!: (response: Response) => void;
    const fetch = vi.fn((url: string) => url.endsWith("/auth/me") ? Promise.resolve(response(200)) : new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetch);
    render(<Detail />);
    await waitFor(() => expect(resolve).toBeDefined());
    act(() => clearSession());
    expect(screen.getByText("찾을 수 없음")).toBeTruthy();
    await act(async () => resolve(response(200, { text: "이전 교인의 비공개 내용" })));
    expect(screen.queryByText("이전 교인의 비공개 내용")).toBeNull();
  });

  it("계정 전환 시 이미 표시된 비공개 내용을 즉시 가린다", async () => {
    setSession("첫 교인");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => response(200, url.endsWith("/auth/me") ? {} : { text: "첫 교인의 내용" })));
    render(<Detail />);
    await screen.findByRole("heading", { name: "첫 교인의 내용" });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    act(() => setSession("다음 교인"));
    expect(screen.queryByText("첫 교인의 내용")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
