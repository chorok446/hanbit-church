import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import type { CellGroupDetail } from "@/data/cell-groups";
import { CellGroupDetailClient } from "./cell-group-detail-client";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const detail: CellGroupDetail = {
  id: "group-1", name: "은혜 목장", active: true,
  members: [], meetings: [], canManage: true, canManageRoster: true,
  createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
};
const deleteRequest = vi.fn<() => Promise<Response>>();

beforeEach(() => {
  vi.clearAllMocks();
  deleteRequest.mockResolvedValue(new Response(null, { status: 204 }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.stubGlobal("fetch", vi.fn((url: string, init?: RequestInit) => {
    expect(url).toMatch(/\/api\/cell-groups\/group-1$/);
    return init?.method === "DELETE" ? deleteRequest() : Promise.resolve(Response.json(detail));
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function openEditor() {
  render(<CellGroupDetailClient groupId={detail.id} />);
  fireEvent.click(await screen.findByRole("button", { name: /^수정$/ }));
  return screen.getByRole("button", { name: "목장 삭제" });
}

describe("목장 삭제 후 이동", () => {
  it("삭제가 성공한 뒤에만 Next.js 라우터로 목장 목록에 이동한다", async () => {
    let complete!: (response: Response) => void;
    deleteRequest.mockReturnValue(new Promise<Response>((resolve) => { complete = resolve; }));
    fireEvent.click(await openEditor());
    expect(deleteRequest).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();

    await act(async () => complete(new Response(null, { status: 204 })));
    expect(push).toHaveBeenCalledExactlyOnceWith("/cell-groups");
    expect(toast.success).toHaveBeenCalledWith("목장을 삭제했습니다.");
  });

  it("확인을 취소하면 삭제 요청도 이동도 하지 않는다", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(await openEditor());
    expect(deleteRequest).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("삭제 요청이 실패하면 오류를 알리고 현재 화면에 남는다", async () => {
    deleteRequest.mockResolvedValue(Response.json({}, { status: 500 }));
    fireEvent.click(await openEditor());
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("삭제에 실패했습니다."));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "목장 삭제" })).toBeTruthy();
  });
});
