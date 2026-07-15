import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminContentItem, AdminContentPageResponse } from "@/data/admin";
import AdminContentClient from "./content-client";

const fetchAdminContentPage = vi.fn<(params: { page?: number }) => Promise<AdminContentPageResponse>>();

vi.mock("@/data/admin", () => ({
  fetchAdminContentPage: (params: { page?: number }) => fetchAdminContentPage(params),
  setAdminContentVisibility: vi.fn(),
  setAdminContentVisibilityBulk: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/ui/pagination", () => ({
  Pagination: ({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(page + 1)}>
      다음 페이지
    </button>
  ),
}));

function pageResponse(items: AdminContentItem[], page: number, totalPages: number): AdminContentPageResponse {
  return { content: items, page, size: 20, totalElements: items.length, totalPages };
}

function hiddenPost(id: string): AdminContentItem {
  return {
    id,
    targetType: "POST",
    title: `숨김 글 ${id}`,
    authorName: "김성도",
    category: "SHARING",
    hidden: true,
    hiddenReason: "신고 처리",
    deleted: false,
  };
}

describe("AdminContentClient 빈 페이지 폴백", () => {
  beforeEach(() => {
    fetchAdminContentPage.mockReset();
  });

  it("현재 페이지가 비면 직전 페이지로 되돌아가 목록을 보여준다", async () => {
    // 1페이지(마지막)의 항목이 방금 전부 복구된 상황: page=1 조회는 빈 결과.
    fetchAdminContentPage.mockImplementation(async ({ page }) =>
      page === 1 ? pageResponse([], 1, 1) : pageResponse([hiddenPost("p1")], 0, 2),
    );

    render(<AdminContentClient />);
    await screen.findByText("숨김 글 p1");

    fireEvent.click(screen.getByRole("button", { name: "다음 페이지" }));

    // 빈 상태 문구에 갇히지 않고 0페이지를 다시 조회해 항목이 보여야 한다.
    await screen.findByText("숨김 글 p1");
    expect(screen.queryByText("콘텐츠가 없습니다.")).toBeNull();
    await waitFor(() =>
      expect(fetchAdminContentPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 })),
    );
  });

  it("0페이지가 빈 것은 그대로 빈 상태로 보여준다", async () => {
    fetchAdminContentPage.mockResolvedValue(pageResponse([], 0, 0));

    render(<AdminContentClient />);
    await screen.findByText("콘텐츠가 없습니다.");
    expect(fetchAdminContentPage).toHaveBeenCalledTimes(1);
  });
});
