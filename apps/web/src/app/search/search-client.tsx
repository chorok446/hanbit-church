"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import {
  appendEventDateRangeFilters,
  eventDateRangeError,
  EMPTY_EVENT_DATE_RANGE_FILTERS,
  readEventDateRangeFilters,
  type EventSearchResponse,
} from "@/data/events";
import type { PostSearchResponse } from "@/data/posts";
import { searchUsersPage, type PublicUserPageResponse } from "@/data/users";
import { ApiError, apiGet } from "@/lib/api";
import { getSessionId } from "@/lib/auth";
import { beginAuthedRequest, clearSessionIfUnauthorized, staleByIdentity } from "@/lib/authed-request";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCanonicalUrl, parsePageParam } from "@/lib/use-url-query";
import { SearchExplore } from "./search-explore";
import {
  SearchFilters,
  buildSearchHref,
  parseSearchRecruitState,
  parseSearchSort,
  parseSearchTag,
  parseSearchType,
  type SearchUrlState,
  type SearchTabCounts,
} from "./search-filters";
import { SearchResults, type ResultState } from "./search-results";

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sessionId: token } = useAuthSession();
  const [retryTick, setRetryTick] = useState(0);
  const generationRef = useRef(0);

  const urlState = useMemo<SearchUrlState>(() => {
    const type = parseSearchType(searchParams.get("type"));
    return {
      query: (searchParams.get("q") ?? "").slice(0, 100),
      type,
      sort: parseSearchSort(searchParams.get("sort"), type),
      recruitState: type === "events" ? parseSearchRecruitState(searchParams.get("recruitState")) : null,
      availableOnly: type === "events" && searchParams.get("availableOnly") === "true",
      tag: parseSearchTag(searchParams.get("tag"), type),
      ...(type === "events"
        ? readEventDateRangeFilters(searchParams)
        : EMPTY_EVENT_DATE_RANGE_FILTERS),
      page: parsePageParam(searchParams.get("page")),
    };
  }, [searchParams]);

  const canonicalHref = buildSearchHref(urlState);
  const currentHref = searchParams.toString() ? `/search?${searchParams.toString()}` : "/search";
  const dateFilterError = eventDateRangeError(urlState);

  useCanonicalUrl(canonicalHref, currentHref);

  const hasQuery = urlState.query.trim().length > 0;
  // 검색어·태그가 없는 전체 탭은 결과 대신 탐색 화면(추천 검색어 + 자주 찾는 메뉴)을 보여준다.
  const isExplore = !hasQuery && !urlState.tag && urlState.type === "all";

  const requestIdentity = JSON.stringify([token, urlState, retryTick]);
  const [resultState, setResultState] = useState<ResultState>({
    identity: "",
    status: "idle",
    events: null,
    posts: null,
    users: null,
    errorMessage: null,
  });
  const currentState = staleByIdentity(resultState, requestIdentity, {
    identity: requestIdentity,
    status: isExplore ? "idle" : "loading",
    events: null,
    posts: null,
    users: null,
    errorMessage: null,
  });

  const updateUrl = useCallback((changes: Partial<SearchUrlState>, replace = false) => {
    const merged = { ...urlState, ...changes };
    const next: SearchUrlState = merged.type === "events"
      ? merged
      : {
          ...merged,
          sort: merged.type === "users" || merged.sort === "deadline" ? "latest" : merged.sort,
          recruitState: null,
          availableOnly: false,
          tag: merged.type === "users" ? "" : merged.tag,
          ...EMPTY_EVENT_DATE_RANGE_FILTERS,
        };
    const href = buildSearchHref(next);
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }, [router, urlState]);

  const resetFilters = () => updateUrl({
    query: "",
    type: "all",
    sort: "latest",
    recruitState: null,
    availableOnly: false,
    tag: "",
    ...EMPTY_EVENT_DATE_RANGE_FILTERS,
    page: 0,
  });

  const runSearch = useCallback(
    (query: string) => updateUrl({ query: query.slice(0, 100), page: 0 }),
    [updateUrl],
  );

  useEffect(() => {
    if (getSessionId() !== token) return;

    const trimmedQuery = urlState.query.trim();

    // 탐색 화면에서는 아무것도 조회하지 않는다 — staleByIdentity 의 placeholder(status: "idle")가 그대로 쓰인다.
    if (!trimmedQuery && !urlState.tag && urlState.type === "all") return;

    // 검색어가 있으면 탭 개수(전체/행사·사역/게시글/사용자) 표기를 위해 세 도메인을 모두 조회한다.
    // page 는 활성 탭(또는 전체 탭)에만 적용하고, 나머지는 개수 파악용으로 0페이지만 가져온다.
    const wantEvents = urlState.type === "all" || urlState.type === "events" || !!trimmedQuery;
    const wantPosts = urlState.type === "all" || urlState.type === "posts" || !!trimmedQuery;
    // 사용자는 이름 검색만 지원 → 검색어가 있을 때만 조회한다.
    // TODO(정책: 사용자 검색 로그인 제한 검토) — 현재는 백엔드 공개 정책(탈퇴·정지 제외한 공개 프로필만 반환)을 따른다.
    const wantUsers = !!trimmedQuery;

    const eventParams = new URLSearchParams();
    if (urlState.query) eventParams.set("q", urlState.query);
    eventParams.set("sort", urlState.sort);
    if (urlState.type === "events" && urlState.recruitState) {
      eventParams.set("recruitState", urlState.recruitState);
    }
    if (urlState.type === "events" && urlState.availableOnly) {
      eventParams.set("availableOnly", "true");
    }
    if (urlState.type === "events") {
      appendEventDateRangeFilters(eventParams, {
        recruitEndFrom: urlState.recruitEndFrom,
        recruitEndTo: urlState.recruitEndTo,
        runStartFrom: urlState.runStartFrom,
        runStartTo: urlState.runStartTo,
      });
    }
    eventParams.set(
      "page",
      urlState.type === "all" || urlState.type === "events" ? urlState.page.toString() : "0",
    );
    eventParams.set("size", "6");

    const postParams = new URLSearchParams();
    if (urlState.query) postParams.set("q", urlState.query);
    if (urlState.tag) postParams.set("tag", urlState.tag);
    postParams.set("sort", urlState.sort === "popular" ? "popular" : "latest");
    postParams.set(
      "page",
      urlState.type === "all" || urlState.type === "posts" ? urlState.page.toString() : "0",
    );
    postParams.set("size", "6");

    const usersPage = urlState.type === "all" || urlState.type === "users" ? urlState.page : 0;
    const usersSize = urlState.type === "users" ? 12 : 6;

    const guard = beginAuthedRequest(generationRef, token);

    const load = async () => {
      const [events, posts, users] = await Promise.all([
        wantEvents
          ? apiGet<EventSearchResponse>(`/api/events/search?${eventParams.toString()}`)
          : Promise.resolve<EventSearchResponse | null>(null),
        wantPosts
          ? apiGet<PostSearchResponse>(`/api/posts/search?${postParams.toString()}`)
          : Promise.resolve<PostSearchResponse | null>(null),
        wantUsers
          ? searchUsersPage(trimmedQuery, usersPage, usersSize)
          : Promise.resolve<PublicUserPageResponse | null>(null),
      ]);
      if (!guard.isCurrent()) return;
      setResultState({ identity: requestIdentity, status: "success", events, posts, users, errorMessage: null });
    };

    load().catch((error) => {
      if (!guard.isCurrent()) return;
      if (clearSessionIfUnauthorized(error, token)) return;
      const errorMessage = error instanceof ApiError && error.status === 400
        ? dateFilterError ?? "날짜 형식이 올바르지 않습니다."
        : "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      setResultState({
        identity: requestIdentity,
        status: "error",
        events: null,
        posts: null,
        users: null,
        errorMessage,
      });
    });

    return guard.cancel;
  }, [
    requestIdentity,
    token,
    dateFilterError,
    urlState.availableOnly,
    urlState.page,
    urlState.query,
    urlState.recruitEndFrom,
    urlState.recruitEndTo,
    urlState.recruitState,
    urlState.runStartFrom,
    urlState.runStartTo,
    urlState.sort,
    urlState.tag,
    urlState.type,
  ]);

  const title = hasQuery
    ? `“${urlState.query}” 검색 결과`
    : urlState.tag
      ? `${urlState.tag} 태그 게시글`
      : "전체 탐색";

  // 검색어가 있고 조회가 끝났을 때만 탭에 개수를 표기한다.
  const tabCounts: SearchTabCounts | null = hasQuery && currentState.status === "success"
    ? {
        events: currentState.events?.totalElements ?? 0,
        posts: currentState.posts?.totalElements ?? 0,
        users: currentState.users?.totalElements ?? 0,
      }
    : null;

  return (
    <PageShell paddingClassName="relative min-h-screen overflow-hidden px-5 pb-20 pt-28 sm:px-6 sm:pt-32" orb="left">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center sm:mb-10">
          <p className="mb-3 text-[11px] uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>Search</p>
          <h1
            className="text-[36px] sm:text-[52px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}
          >
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 opacity-60" style={{ color: "var(--foreground)" }}>
            행사, 게시글, 새가족 안내와 같은 정보를 한 번에 찾아보세요.
          </p>
        </div>

        <SearchFilters
          state={urlState}
          loading={currentState.status === "loading"}
          counts={tabCounts}
          onUpdate={updateUrl}
          onReset={resetFilters}
        />

        {isExplore ? (
          <SearchExplore onSearch={runSearch} />
        ) : (
          <SearchResults
            urlState={urlState}
            currentState={currentState}
            onRetry={() => setRetryTick((tick) => tick + 1)}
            onUpdate={(changes) => updateUrl(changes)}
            onReset={resetFilters}
            onSearch={runSearch}
          />
        )}
      </div>
    </PageShell>
  );
}
