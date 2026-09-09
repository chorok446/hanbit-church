import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { getName, getSessionId } from "@/lib/auth";
import LoginPage from "./page";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

const profile = { name: "복귀 검증", verified: true };
const request = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/login");
  request.mockReset().mockImplementation(async () => Response.json(profile));
  vi.stubGlobal("fetch", request);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

function login(next?: string) {
  if (next !== undefined) {
    window.history.replaceState(null, "", `/login?${new URLSearchParams({ next })}`);
  }
  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "redirect-test@hanbit.local" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "LocalFixtureOnly1!" } });
  fireEvent.click(screen.getByRole("button", { name: /^로그인$/ }));
}

describe("로그인 후 내부 페이지 복귀", () => {
  it.each([
    undefined, "", "https://redirect.invalid", "javascript:alert(1)",
    "//redirect.invalid", "///redirect.invalid", "/\\redirect.invalid",
    "/\n/redirect.invalid", "/\t/redirect.invalid", "/\r/redirect.invalid",
    "/safe/..//redirect.invalid", "/%2e%2e//redirect.invalid",
  ])("안전하지 않거나 없는 복귀 주소 %j 는 교제로 이동한다", async (next) => {
    login(next);
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/feed"));
    expect(getSessionId()).toBeTruthy();
    expect(getName()).toBe(profile.name);
  });

  it.each([
    "/", "/cell-groups/1", "/mypage?tab=account#security",
    "/feed?q=은혜&source=https%3A%2F%2Fexample.com",
  ])("정상 내부 주소 %j 의 경로·쿼리·해시를 보존한다", async (next) => {
    login(next);
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(next));
  });

  it.each(["//redirect.invalid", "/\\redirect.invalid", "/cell-groups/1"])(
    "2단계 인증 완료 후에도 같은 복귀 주소 검증을 적용한다: %j",
    async (next) => {
      request.mockImplementationOnce(async () => Response.json({ twoFactorRequired: true, challengeToken: "local-test" }));
      login(next);
      const otp = await screen.findByLabelText("인증 코드");
      expect(push).not.toHaveBeenCalled();
      expect(getSessionId()).toBeNull();
      fireEvent.change(otp, { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: "인증하고 로그인" }));
      await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith(next === "/cell-groups/1" ? next : "/feed"));
      expect(request).toHaveBeenLastCalledWith(expect.stringMatching(/\/api\/auth\/2fa\/verify$/), expect.objectContaining({
        method: "POST", credentials: "include", body: JSON.stringify({ challengeToken: "local-test", code: "123456" }),
      }));
    },
  );

  it("임시 비밀번호 변경 안내는 복귀 주소보다 우선한다", async () => {
    request.mockImplementation(async () => Response.json({ ...profile, passwordChangeRequired: true }));
    login("/cell-groups/1");
    await waitFor(() => expect(push).toHaveBeenCalledExactlyOnceWith("/mypage?tab=account"));
    expect(toast.info).toHaveBeenCalledOnce();
  });

  it("로그인 실패 시에는 복귀 주소로 이동하지 않는다", async () => {
    request.mockImplementation(async () => Response.json({}, { status: 401 }));
    login("/cell-groups/1");
    expect(await screen.findByText("이메일 또는 비밀번호가 올바르지 않습니다.")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(getSessionId()).toBeNull();
  });
});
