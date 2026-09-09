import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { NotificationItem } from "@/data/notifications";
import { NotificationRow } from "./notification-row";

const item: NotificationItem = {
  id: "notice-1", type: "POST_COMMENT_CREATED", title: "새 댓글 알림",
  body: "댓글이 등록되었습니다.", href: "/posts/1#comments", read: false,
  readAt: null, time: "방금 전",
};

describe("알림 링크 렌더링", () => {
  it.each([false, true])("외부 목적지는 읽음 상태(%j)와 관계없이 링크를 렌더링하지 않는다", (read) => {
    const onOpen = vi.fn();
    const onMarkRead = vi.fn();
    const onDelete = vi.fn();
    render(<NotificationRow item={{ ...item, href: "//redirect.invalid", read }} pending={false} deleting={false}
      onOpen={onOpen} onMarkRead={onMarkRead} onDelete={onDelete} />);

    expect(screen.queryByRole("link")).toBeNull();
    fireEvent.click(screen.getByRole("group", { name: /^새 댓글 알림/ }));
    expect(onOpen).not.toHaveBeenCalled();
    if (!read) {
      fireEvent.click(screen.getByRole("button", { name: "읽음으로 표시" }));
      expect(onMarkRead).toHaveBeenCalledExactlyOnceWith(item.id);
    }
    fireEvent.click(screen.getByRole("button", { name: "알림 삭제" }));
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(item.id);
  });

  it("정상 내부 링크는 읽음 처리 후 이동하는 흐름을 유지한다", () => {
    const onOpen = vi.fn();
    render(<NotificationRow item={item} pending={false} deleting={false}
      onOpen={onOpen} onMarkRead={vi.fn()} onDelete={vi.fn()} />);
    const link = screen.getByRole("link", { name: /^새 댓글 알림/ });
    expect(link.getAttribute("href")).toBe(item.href);
    fireEvent.click(link);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(item);
  });
});
