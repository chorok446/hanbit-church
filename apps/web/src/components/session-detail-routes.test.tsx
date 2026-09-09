import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";

const mocks = vi.hoisted(() => ({ get: vi.fn(), params: { id: "post-uuid-test" }, pathname: "/posts/post-uuid-test" }));
vi.mock("@/lib/api-server", () => ({ apiGetOrNullWithCookies: mocks.get }));
vi.mock("next/navigation", () => ({ useParams: () => mocks.params, usePathname: () => mocks.pathname, notFound: () => { throw new Error("NEXT_NOT_FOUND"); } }));
vi.mock("@/app/posts/[id]/post-detail-session", () => ({ PostDetailSession: ({ id }: { id: string }) => <p>post recovery {id}</p> }));
vi.mock("@/app/events/[id]/event-detail-session", () => ({ EventDetailSession: ({ id }: { id: string }) => <p>event recovery {id}</p> }));
vi.mock("@/app/users/[id]/user-profile-session", () => ({ UserProfileSession: ({ id }: { id: string }) => <p>user recovery {id}</p> }));
vi.mock("@/app/posts/[id]/post-detail-client", () => ({ default: () => <p>public post</p> }));
vi.mock("@/app/events/[id]/event-detail-client", () => ({ default: () => <p>public event</p> }));
vi.mock("@/app/not-found", () => ({ default: () => <p>not found</p> }));

import PostPage, { generateMetadata as postMetadata } from "@/app/posts/[id]/page";
import EventPage, { generateMetadata as eventMetadata } from "@/app/events/[id]/page";
import UserPage, { generateMetadata as userMetadata } from "@/app/users/[id]/page";
import { UserProfileSession } from "@/app/users/[id]/user-profile-session";
import PostNotFound from "@/app/posts/[id]/not-found";
import EventNotFound from "@/app/events/[id]/not-found";
import { ApiError } from "@/lib/api";

beforeEach(() => { mocks.get.mockReset(); mocks.pathname = "/posts/post-uuid-test"; });
const props = { params: Promise.resolve({ id: "post-uuid-test" }) };

describe("SSR 상세 복구 배선", () => {
  it("UUID 게시글/행사 404 경계에도 복구가 연결된다", () => {
    render(<PostNotFound />);
    expect(screen.getByText("post recovery post-uuid-test")).toBeTruthy();
    mocks.pathname = "/events/post-uuid-test";
    render(<EventNotFound />);
    expect(screen.getByText("event recovery post-uuid-test")).toBeTruthy();
  });

  it("수정/참가자 관리의 404를 상세 복구로 바꾸지 않는다", () => {
    mocks.pathname = "/posts/post-uuid-test/edit";
    const post = render(<PostNotFound />);
    expect(screen.getByText("not found")).toBeTruthy();
    post.unmount();
    mocks.pathname = "/events/post-uuid-test/participants";
    render(<EventNotFound />);
    expect(screen.getByText("not found")).toBeTruthy();
  });

  it.each([{ visibility: "MEMBERS" }, { hidden: true }])("비공개 게시글은 세션 경계와 noindex를 사용한다: %j", async (privacy) => {
    mocks.get.mockResolvedValue({ id: "post-uuid-test", ...privacy } as Post);
    const page = await PostPage(props);
    render(page);
    expect(screen.getByText("post recovery post-uuid-test")).toBeTruthy();
    expect(await postMetadata(props)).toEqual({ title: "게시글", robots: { index: false, follow: false } });
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("숨긴 행사는 세션 경계에서만 표시하고 구조화 데이터를 생성하지 않는다", async () => {
    mocks.get.mockResolvedValue({ id: "post-uuid-test", hidden: true } as Event);
    render(await EventPage(props));
    expect(screen.getByText("event recovery post-uuid-test")).toBeTruthy();
    expect(await eventMetadata(props)).toMatchObject({ robots: { index: false, follow: false } });
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it("실제 404의 서버 notFound 응답을 유지한다", async () => {
    mocks.get.mockResolvedValue(null);
    await expect(PostPage(props)).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(EventPage(props)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("프로필 SSR 401은 정적인 로그인 화면에 갇히지 않고 복구 경계를 거친다", async () => {
    const error = new ApiError(401, "/api/users/1");
    mocks.get.mockRejectedValue(error);
    const result = await UserPage({ params: Promise.resolve({ id: "1" }) });
    expect(result.type).toBe(UserProfileSession);
    expect(result.props.id).toBe("1");
    expect(userMetadata()).toEqual({ title: "교우 프로필", robots: { index: false, follow: false } });
  });
});
