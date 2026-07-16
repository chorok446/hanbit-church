// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ScrollToTopButton } from "./scroll-to-top-button";

beforeAll(() => {
  // jsdom 에는 matchMedia 가 없다 — motion 의 useReducedMotion 이 참조한다.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, writable: true, configurable: true });
}

describe("ScrollToTopButton", () => {
  it("페이지 상단에서는 렌더하지 않는다", () => {
    setScrollY(0);
    render(<ScrollToTopButton />);
    expect(screen.queryByRole("button", { name: "맨 위로" })).toBeNull();
  });

  it("임계치 아래로 스크롤하면 나타나고, 클릭하면 맨 위로 스크롤한다", () => {
    setScrollY(600);
    render(<ScrollToTopButton />);
    const button = screen.getByRole("button", { name: "맨 위로" });

    // 직접 대입은 restoreAllMocks 로 복원되지 않는다 — spy 로 감싸 afterEach 에서 원복.
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    fireEvent.click(button);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  });

  it("다시 위로 올라가면 사라진다", async () => {
    setScrollY(600);
    render(<ScrollToTopButton />);
    expect(screen.getByRole("button", { name: "맨 위로" })).toBeTruthy();

    setScrollY(0);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    // AnimatePresence 퇴장 애니메이션이 끝나면 DOM 에서 제거된다.
    await vi.waitFor(() => {
      expect(screen.queryByRole("button", { name: "맨 위로" })).toBeNull();
    });
  });
});
