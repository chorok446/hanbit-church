"use client";

import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { getSessionId, PROFILE_EVENT } from "@/lib/auth";
import { beginAuthedRequest, clearSessionIfUnauthorized } from "@/lib/authed-request";
import { useAuthSession } from "@/lib/use-auth-session";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { FilterPillGroup } from "@/components/filter-pill-group";
import { PageShell } from "@/components/page-shell";
import { FeedPostCard } from "@/app/feed/feed-post-card";
import { FeedSideHot } from "@/app/feed/feed-sidebar";
import { FeedControls, feedHasActiveFilters } from "@/app/feed/feed-controls";
import { ListEmptyState } from "@/components/list-empty-state";
import { PostBoardList } from "@/components/post-board-list";
import { StaggerItem } from "@/components/scroll-reveal";
import { SkeletonCards } from "@/components/ui/skeleton-cards";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { POST_CATEGORIES, type PostCategory, type PostSearchResponse } from "@/data/posts";
import type { Event } from "@/data/events";
import { useCanonicalUrl, parsePageParam, buildFeedHref, type FeedUrlState } from "@/lib/use-url-query";

type UrlState = FeedUrlState;

// 교제에서 다루는 커뮤니티 카테고리 — 공지·주보·설교는 소식/설교 페이지 몫.
const FEED_CATEGORIES = POST_CATEGORIES.filter(
  (item) => item.value === "SHARING" || item.value === "PRAYER",
);
const FEED_ALL_CATEGORIES = FEED_CATEGORIES.map((item) => item.value).join(",");

type SearchState = {
  identity: string;
  queryIdentity: string;
  token: string | null;
  status: "loading" | "success" | "error";
  response: PostSearchResponse | null;
};

function neutralizeInteractions(response: PostSearchResponse): PostSearchResponse {
  return {
    ...response,
    content: response.content.map((post) => ({
      ...post,
      likedByMe: false,
      bookmarkedByMe: false,
      ownedByMe: false,
    })),
  };
}

export default function FeedClient({ events }: { events: Event[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId: token } = useAuthSession();
  const [retryTick, setRetryTick] = useState(0);
  // 교회 게시판답게 리스트(게시판)가 기본, 카드 피드는 "갤러리" 탭으로 분리한다.
  const [view, setView] = useState<"list" | "gallery">("list");
  const generationRef = useRef(0);

  useEffect(() => {
    const onProfileUpdated = () => setRetryTick((tick) => tick + 1);
    window.addEventListener(PROFILE_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_EVENT, onProfileUpdated);
  }, []);

  const urlState = useMemo<UrlState>(() => {
    const sort = searchParams.get("sort");
    const category = searchParams.get("category");
    return {
      query: searchParams.get("q") ?? "",
      eventOnly: searchParams.get("eventOnly") === "true",
      // 교제는 성도 커뮤니티 공간 — 공지·주보·설교는 소식/설교 페이지 몫이라 나눔·기도만 다룬다.
      category: FEED_CATEGORIES.some((item) => item.value === category)
        ? (category as PostCategory)
        : null,
      sort: sort === "popular" || sort === "discussed" ? sort : "latest",
      page: parsePageParam(searchParams.get("page")),
    };
  }, [searchParams]);
  const canonicalHref = buildFeedHref(urlState);
  const currentHref = searchParams.toString() ? `/feed?${searchParams.toString()}` : "/feed";
  useCanonicalUrl(canonicalHref, currentHref);
  const queryIdentity = JSON.stringify(urlState);
  const requestIdentity = JSON.stringify([token, queryIdentity, retryTick]);
  const [searchState, setSearchState] = useState<SearchState>({
    identity: "",
    queryIdentity: "",
    token: null,
    status: "loading",
    response: null,
  });
  const requestIsCurrent = searchState.identity === requestIdentity;
  const response = useMemo(() => {
    if (requestIsCurrent) return searchState.response;
    if (searchState.queryIdentity !== queryIdentity || !searchState.response) return null;
    return searchState.token === token
      ? searchState.response
      : neutralizeInteractions(searchState.response);
  }, [queryIdentity, requestIsCurrent, searchState.queryIdentity, searchState.response, searchState.token, token]);
  const requestStatus = requestIsCurrent ? searchState.status : "loading";
  const refreshing = requestStatus === "loading";

  const updateUrl = useCallback((changes: Partial<UrlState>, replace = false) => {
    const next = { ...urlState, ...changes };
    const href = buildFeedHref(next);
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router, urlState]);

  const commitSearch = useCallback((query: string) => {
    updateUrl({ query, page: 0 }, true);
  }, [updateUrl]);

  const goToNewPost = () => {
    if (!getSessionId()) {
      toast.error("교제 글을 작성하려면 로그인이 필요합니다.");
      router.push("/login?next=/posts/new");
      return;
    }
    router.push("/posts/new");
  };

  const searchPath = useMemo(() => {
    const params = new URLSearchParams();
    if (urlState.query) params.set("q", urlState.query);
    if (urlState.eventOnly) params.set("eventOnly", "true");
    // 전체 = 나눔+기도(콤마 다중 카테고리) — 공지·주보·설교는 교제에 올라오지 않는다.
    params.set("category", urlState.category ?? FEED_ALL_CATEGORIES);
    params.set("sort", urlState.sort);
    params.set("page", urlState.page.toString());
    params.set("size", "10");
    return `/api/posts/search?${params.toString()}`;
  }, [urlState.eventOnly, urlState.category, urlState.page, urlState.query, urlState.sort]);

  useEffect(() => {
    const requestToken = token;
    if (getSessionId() !== requestToken) return;

    const guard = beginAuthedRequest(generationRef, requestToken);

    apiGet<PostSearchResponse>(searchPath)
      .then((nextResponse) => {
        if (!guard.isCurrent()) return;
        setSearchState({
          identity: requestIdentity,
          queryIdentity,
          token: requestToken,
          status: "success",
          response: nextResponse,
        });
      })
      .catch((error) => {
        if (!guard.isCurrent()) return;
        if (clearSessionIfUnauthorized(error, requestToken)) return;
        setSearchState((previous) => {
          const previousResponse = previous.queryIdentity === queryIdentity ? previous.response : null;
          const fallback = previousResponse && previous.token !== requestToken
            ? neutralizeInteractions(previousResponse)
            : previousResponse;
          return {
            identity: requestIdentity,
            queryIdentity,
            token: requestToken,
            status: "error",
            response: fallback,
          };
        });
      });

    return guard.cancel;
  }, [queryIdentity, requestIdentity, searchPath, token]);

  return (
    <>
      {/* 컴팩트 네이비 밴드 — 마케팅 히어로가 아닌 커뮤니티/앱 페이지 공통 헤더. 골드 글로우 없음. */}
      <section className="px-6 pb-11 pt-[124px]" style={{ background: "var(--banner-bg)" }}>
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
            Community
          </p>
          <h1
            className="text-[32px] text-[var(--on-banner)] sm:text-[38px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            성도의 교제
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: "rgba(var(--on-banner-rgb),0.72)" }}>
            함께 나누고, 기도하고, 서로를 격려하는 공간입니다.
          </p>
        </div>
      </section>
      <PageShell paddingClassName="relative min-h-screen px-6 pb-20 pt-10 overflow-hidden" orb="left">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main>
          <button
            type="button"
            onClick={goToNewPost}
            aria-label="새 글 작성"
            className="w-full flex items-center gap-3 p-4 rounded-2xl border mb-6 shadow-[0_18px_44px_-30px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 transition-transform text-left"
            style={{
              background: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <CurrentUserAvatar />
            <span className="flex-1 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              성도들과 나누고 싶은 이야기가 있나요?
            </span>
            <span className="flex items-center gap-1.5 text-[13px] px-3.5 py-1.5 rounded-full" style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}>
              <ImageIcon size={14} aria-hidden /> 새 글
            </span>
          </button>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex rounded-full border p-0.5"
                role="tablist"
                aria-label="보기 형식"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                {([
                  { value: "list", label: "리스트" },
                  { value: "gallery", label: "갤러리" },
                ] as const).map((tab) => {
                  const active = view === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setView(tab.value)}
                      className="min-h-11 rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                      style={
                        active
                          ? { background: "var(--cta-bg)", color: "var(--cta-fg)" }
                          : { color: "var(--foreground-muted)" }
                      }
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              {/* 결과 카운트는 검색·필터가 걸려 있을 때만 의미 있는 정보라 그때만 노출한다. */}
              {response && feedHasActiveFilters(urlState) ? (
                <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }} aria-live="polite">
                  검색 결과 {response.totalElements.toLocaleString()}개
                </p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="피드 새로고침"
              title="피드 새로고침"
              onClick={() => setRetryTick((tick) => tick + 1)}
              disabled={refreshing}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-45"
              style={{ background: "rgba(var(--ink-rgb), 0.07)" }}
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>

          <FeedControls
            state={urlState}
            loading={refreshing}
            onSearch={commitSearch}
            onSort={(sort) => updateUrl({ sort, page: 0 })}
            onEventOnly={(eventOnly) => updateUrl({ eventOnly, page: 0 })}
            onPatch={(changes) => updateUrl(changes)}
            onResetAll={() => updateUrl({ query: "", eventOnly: false, category: null, sort: "latest", page: 0 })}
          />

          <div className="-mt-2 mb-6">
            <FilterPillGroup
              items={[{ key: "all", label: "전체" }, ...FEED_CATEGORIES.map((item) => ({ key: item.value, label: item.label }))]}
              value={urlState.category ?? "all"}
              onChange={(key) => updateUrl({ category: key === "all" ? null : (key as PostCategory), page: 0 })}
              layoutId="feed-category-pill"
              label="카테고리 필터"
            />
          </div>

          {requestStatus === "loading" && !response ? (
            <SkeletonCards count={4} className="grid grid-cols-1 gap-5 sm:grid-cols-2" />
          ) : null}

          {requestStatus === "error" && !response ? (
            <StatePanel>
              <p style={{ color: "var(--foreground-muted)" }}>게시글을 불러오지 못했습니다.</p>
              <button
                type="button"
                onClick={() => setRetryTick((tick) => tick + 1)}
                className="rounded-full cta-solid px-5 py-2 text-[13px]"
              >
                다시 시도
              </button>
            </StatePanel>
          ) : null}

          {requestStatus === "error" && response ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgba(var(--danger-rgb),0.25)] px-4 py-3 text-[12px] text-[var(--danger)]">
              <span>최신 게시글을 불러오지 못해 이전 결과를 표시합니다.</span>
              <button type="button" onClick={() => setRetryTick((tick) => tick + 1)} className="underline underline-offset-4">
                다시 시도
              </button>
            </div>
          ) : null}

          {requestStatus === "success" && response?.content.length === 0 ? (
            <ListEmptyState
              title={
                urlState.query
                  ? "검색 결과가 없습니다."
                  : feedHasActiveFilters(urlState)
                    ? "조건에 맞는 글이 없습니다."
                    : "아직 게시글이 없어요."
              }
              description={
                urlState.query
                  ? "다른 키워드로 검색해 주세요."
                  : feedHasActiveFilters(urlState)
                    ? "필터를 초기화해 보세요."
                    : "첫 나눔을 남겨보세요."
              }
              action={
                feedHasActiveFilters(urlState) ? (
                  <button
                    type="button"
                    onClick={() => updateUrl({ query: "", eventOnly: false, category: null, sort: "latest", page: 0 })}
                    className="rounded-full cta-solid px-5 py-2 text-[13px] font-medium"
                  >
                    전체 게시글 보기
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToNewPost}
                    className="rounded-full cta-solid px-5 py-2 text-[13px] font-medium"
                  >
                    새 글 작성
                  </button>
                )
              }
            />
          ) : null}

          {response && response.content.length > 0 ? (
            view === "list" ? (
              <PostBoardList posts={response.content} />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {response.content.map((post, i) => (
                  <StaggerItem key={post.id} index={i}>
                    <FeedPostCard
                      p={post}
                      refreshing={refreshing}
                      identity={token}
                      onOpen={() => router.push(`/posts/${post.id}`)}
                    />
                  </StaggerItem>
                ))}
              </div>
            )
          ) : null}

          {response && response.totalElements > 0 ? (
            <Pagination
              page={response.page}
              totalPages={response.totalPages}
              totalElements={response.totalElements}
              disabled={refreshing}
              className="mt-8"
              onPageChange={(page) => updateUrl({ page })}
            />
          ) : null}

          {/* lg 미만에서는 aside 가 숨겨지므로 진행 중 행사를 목록 아래에서 보여준다. */}
          <div className="mt-10 lg:hidden">
            <FeedSideHot events={events} />
          </div>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24 flex flex-col gap-5">
            <FeedSideHot events={events} />
          </div>
        </aside>
      </div>
      </PageShell>
    </>
  );
}
