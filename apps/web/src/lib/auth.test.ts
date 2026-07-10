// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_EVENT, clearRememberedLoginEmail, clearSession, getName, getSessionId, notifyProfileUpdated, PROFILE_EVENT, setSession } from "./auth";

describe("auth session marker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setSession 은 새 세션 식별자와 이름을 저장하고 AUTH_EVENT 를 발화한다", () => {
    const listener = vi.fn();
    window.addEventListener(AUTH_EVENT, listener);

    setSession("홍길동");
    expect(getSessionId()).toBeTruthy();
    expect(getName()).toBe("홍길동");
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EVENT, listener);
  });

  it("재로그인마다 세션 식별자가 바뀐다 — staleness 가드의 전제", () => {
    setSession("첫번째");
    const first = getSessionId();
    setSession("두번째");
    expect(getSessionId()).not.toBe(first);
  });

  it("clearSession 은 마커와 레거시 토큰 키까지 지운다", () => {
    localStorage.setItem("hanbit.token", "legacy-jwt");
    setSession("홍길동");
    clearSession();
    expect(getSessionId()).toBeNull();
    expect(getName()).toBeNull();
    expect(localStorage.getItem("hanbit.token")).toBeNull();
  });

  it("setSession 도 레거시 토큰 키를 정리한다", () => {
    localStorage.setItem("hanbit.token", "legacy-jwt");
    setSession("홍길동");
    expect(localStorage.getItem("hanbit.token")).toBeNull();
  });

  it("clearRememberedLoginEmail 은 기억하기 저장만 지운다 — clearSession 은 유지", () => {
    localStorage.setItem("hanbit.login-email", "user@test.com");
    setSession("홍길동");
    clearSession();
    // 로그아웃(clearSession)은 기억하기를 유지한다.
    expect(localStorage.getItem("hanbit.login-email")).toBe("user@test.com");
    clearRememberedLoginEmail();
    expect(localStorage.getItem("hanbit.login-email")).toBeNull();
  });

  it("notifyProfileUpdated 는 PROFILE_EVENT 를 발화한다", () => {
    const listener = vi.fn();
    window.addEventListener(PROFILE_EVENT, listener);
    notifyProfileUpdated();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PROFILE_EVENT, listener);
  });
});
