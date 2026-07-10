// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sharePage } from "./share";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

/** navigator 의 share/clipboard 를 테스트마다 갈아끼운다(jsdom 은 둘 다 없음). */
function stubNavigator(props: { share?: unknown; clipboard?: unknown }) {
  Object.defineProperty(navigator, "share", { value: props.share, configurable: true });
  Object.defineProperty(navigator, "clipboard", { value: props.clipboard, configurable: true });
}

describe("sharePage — Web Share → 클립보드 → 안내 폴백 체인", () => {
  beforeEach(() => {
    toast.success.mockReset();
    toast.error.mockReset();
  });

  afterEach(() => {
    stubNavigator({ share: undefined, clipboard: undefined });
  });

  it("navigator.share 가 있으면 그걸 쓰고 토스트는 띄우지 않는다", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share });

    await sharePage({ title: "행사", url: "https://church/events/1" });
    expect(share).toHaveBeenCalledWith({ title: "행사", text: undefined, url: "https://church/events/1" });
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("공유 시트를 사용자가 닫으면(AbortError) 조용히 끝난다", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancel", "AbortError"));
    stubNavigator({ share });

    await sharePage({ title: "행사", url: "https://church/x" });
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("share 가 없으면 클립보드 복사로 폴백하고 성공 토스트를 띄운다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubNavigator({ share: undefined, clipboard: { writeText } });

    await sharePage({ title: "행사", url: "https://church/x" });
    expect(writeText).toHaveBeenCalledWith("https://church/x");
    expect(toast.success).toHaveBeenCalledWith("링크를 복사했어요.");
  });

  it("클립보드까지 실패하면 수동 복사 안내를 띄운다", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    stubNavigator({ share: undefined, clipboard: { writeText } });

    await sharePage({ title: "행사", url: "https://church/x" });
    expect(toast.error).toHaveBeenCalledWith("공유할 수 없어요. 주소창의 URL을 복사해 주세요.");
  });
});
