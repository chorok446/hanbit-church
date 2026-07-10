"use client";

import { RefreshCw } from "lucide-react";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatePanel } from "@/components/ui/state-panel";
import { StaggerItem } from "@/components/scroll-reveal";
import type { EventSearchResponse } from "@/data/events";
import type { PostSearchResponse } from "@/data/posts";
import type { PublicUserPageResponse } from "@/data/users";
import { MenuShortcutCard, RecommendedQueryChips } from "./search-explore";
import { matchMenuShortcuts } from "./search-menu";
import { EventResultCard, PostResultCard, UserResultCard } from "./search-result-cards";
import type { SearchUrlState } from "./search-filters";
import { searchHasActiveFilters } from "./search-filters";

type ResultState = {
  identity: string;
  status: "idle" | "loading" | "success" | "error";
  events: EventSearchResponse | null;
  posts: PostSearchResponse | null;
  users: PublicUserPageResponse | null;
  errorMessage: string | null;
};

function SectionHeader({
  eyebrow,
  title,
  countLabel,
}: {
  eyebrow: string;
  title: string;
  countLabel: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.25em] text-[var(--accent-strong)]">{eyebrow}</p>
        <h2
          className="mt-1 text-[24px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}
        >
          {title}
        </h2>
      </div>
      <span className="text-[12px] opacity-55" style={{ color: "var(--foreground)" }}>
        {countLabel}
      </span>
    </div>
  );
}

export function SearchResults({
  urlState,
  currentState,
  onRetry,
  onUpdate,
  onReset,
  onSearch,
}: {
  urlState: SearchUrlState;
  currentState: ResultState;
  onRetry: () => void;
  onUpdate: (changes: Partial<SearchUrlState>) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
}) {
  const query = urlState.query.trim();
  const highlight = query || undefined;

  const eventResponse = currentState.events;
  const postResponse = currentState.posts;
  const userResponse = currentState.users;
  const totalResults = (eventResponse?.totalElements ?? 0)
    + (postResponse?.totalElements ?? 0)
    + (userResponse?.totalElements ?? 0);
  const allEmpty = urlState.type === "all"
    && (eventResponse === null || eventResponse.content.length === 0)
    && (postResponse === null || postResponse.content.length === 0)
    && (userResponse === null || userResponse.content.length === 0);

  // 검색어가 주요 메뉴명·설명에 걸리면 "바로가기" 섹션으로 안내한다(전체 탭에서만).
  const menuShortcuts = urlState.type === "all" && query ? matchMenuShortcuts(query) : [];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          {currentState.status === "success" && query ? (
            <>
              <p className="text-[14px]" style={{ color: "var(--foreground)" }}>
                “{query}” 검색 결과 <strong>{totalResults.toLocaleString()}</strong>개
              </p>
              <p className="mt-0.5 text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>
                행사·사역 {(eventResponse?.totalElements ?? 0).toLocaleString()}개
                {" · "}게시글 {(postResponse?.totalElements ?? 0).toLocaleString()}개
                {" · "}사용자 {(userResponse?.totalElements ?? 0).toLocaleString()}명
              </p>
            </>
          ) : currentState.status === "loading" ? (
            <p className="text-[13px] opacity-65" style={{ color: "var(--foreground)" }}>
              검색 중입니다…
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="결과 새로고침"
          title="결과 새로고침"
          onClick={onRetry}
          disabled={currentState.status === "loading"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-45"
          style={{ background: "rgba(var(--ink-rgb), 0.07)" }}
        >
          <RefreshCw size={16} className={currentState.status === "loading" ? "animate-spin" : ""} />
        </button>
      </div>

      {currentState.status === "loading" ? (
        <StatePanel>
          <RefreshCw size={28} className="animate-spin text-[var(--accent)]" />
          <p style={{ color: "var(--foreground-muted)" }}>검색 중입니다…</p>
        </StatePanel>
      ) : null}

      {currentState.status === "error" ? (
        <StatePanel>
          <p style={{ color: "var(--foreground-muted)" }}>
            {currentState.errorMessage ?? "검색 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full px-5 py-2 text-[13px]"
            style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          >
            다시 시도
          </button>
        </StatePanel>
      ) : null}

      {currentState.status === "success" && allEmpty ? (
        <div className="space-y-6">
          <ListEmptyState
            title="검색 결과가 없습니다."
            description="다른 키워드로 검색해보세요."
            action={
              searchHasActiveFilters(urlState) && !query ? (
                <button
                  type="button"
                  onClick={onReset}
                  className="rounded-full px-5 py-2 text-[13px] font-medium"
                  style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
                >
                  필터 초기화
                </button>
              ) : undefined
            }
          />
          {query ? <RecommendedQueryChips onSearch={onSearch} /> : null}
        </div>
      ) : null}

      {currentState.status === "success" && urlState.type === "events" && eventResponse?.content.length === 0 ? (
        <ListEmptyState
          title={query ? "검색 결과가 없습니다." : "조건에 맞는 행사·사역이 없어요."}
          description={query ? "다른 키워드로 검색해보세요." : "필터를 초기화하거나 조건을 바꿔보세요."}
          action={
            <button
              type="button"
              onClick={onReset}
              className="rounded-full px-5 py-2 text-[13px] font-medium"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              전체 행사·사역 보기
            </button>
          }
        />
      ) : null}

      {currentState.status === "success" && urlState.type === "users" && !query ? (
        <ListEmptyState
          title="이름으로 사용자를 찾아보세요."
          description="검색창에 닉네임을 입력하면 사용자를 검색할 수 있어요."
        />
      ) : null}

      {currentState.status === "success" && urlState.type === "users" && query
        && userResponse?.content.length === 0 ? (
          <ListEmptyState
            title="검색 결과가 없습니다."
            description="다른 키워드로 검색해보세요."
          />
        ) : null}

      {currentState.status === "success" && urlState.type === "posts" && postResponse?.content.length === 0 ? (
        <ListEmptyState
          title={query ? "검색 결과가 없습니다." : "조건에 맞는 게시글이 없어요."}
          description={query ? "다른 키워드로 검색해보세요." : "정렬이나 태그를 바꿔보세요."}
          action={
            <button
              type="button"
              onClick={onReset}
              className="rounded-full px-5 py-2 text-[13px] font-medium"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              전체 게시글 보기
            </button>
          }
        />
      ) : null}

      {/* 전체 탭 섹션 순서: 행사·사역 → 게시글 → 사용자 → 바로가기. 결과 0 섹션은 렌더하지 않는다. */}
      {currentState.status === "success"
        && (urlState.type === "all" || urlState.type === "events")
        && eventResponse && eventResponse.content.length > 0 ? (
          <section className="mb-12">
            <SectionHeader
              eyebrow="Events & Ministry"
              title="행사·사역"
              countLabel={`${eventResponse.totalElements.toLocaleString()}개`}
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {eventResponse.content.slice(0, 6).map((event, i) => (
                <StaggerItem key={event.id} index={i}>
                  <EventResultCard event={event} highlight={highlight} />
                </StaggerItem>
              ))}
            </div>
            {urlState.type === "all" && eventResponse.totalElements > eventResponse.content.length ? (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => onUpdate({ type: "events", page: 0 })}
                  className="rounded-full border px-5 py-2.5 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  행사·사역 더 보기
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

      {currentState.status === "success"
        && (urlState.type === "all" || urlState.type === "posts")
        && postResponse && postResponse.content.length > 0 ? (
          <section className="mb-12">
            <SectionHeader
              eyebrow="Posts"
              title="게시글"
              countLabel={`${postResponse.totalElements.toLocaleString()}개`}
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {postResponse.content.slice(0, 6).map((post, i) => (
                <StaggerItem key={post.id} index={i}>
                  <PostResultCard post={post} highlight={highlight} />
                </StaggerItem>
              ))}
            </div>
            {urlState.type === "all" && postResponse.totalElements > postResponse.content.length ? (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => onUpdate({ type: "posts", page: 0 })}
                  className="rounded-full border px-5 py-2.5 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  게시글 더 보기
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

      {/* 사용자 결과는 이름·아바타·게시글 수 등 공개 정보만 노출한다(이메일·연락처 없음). */}
      {currentState.status === "success"
        && (urlState.type === "all" || urlState.type === "users")
        && userResponse && userResponse.content.length > 0 ? (
          <section className="mb-12">
            <SectionHeader
              eyebrow="Users"
              title="사용자"
              countLabel={`${userResponse.totalElements.toLocaleString()}명`}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userResponse.content.slice(0, urlState.type === "users" ? undefined : 6).map((user, i) => (
                <StaggerItem key={user.id} index={i}>
                  <UserResultCard user={user} highlight={highlight} />
                </StaggerItem>
              ))}
            </div>
            {urlState.type === "all" && userResponse.totalElements > userResponse.content.length ? (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => onUpdate({ type: "users", page: 0 })}
                  className="rounded-full border px-5 py-2.5 text-[13px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  사용자 더 보기
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

      {currentState.status === "success" && menuShortcuts.length > 0 ? (
        <section className="mb-12">
          <SectionHeader
            eyebrow="Quick Links"
            title="바로가기"
            countLabel={`${menuShortcuts.length.toLocaleString()}개`}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menuShortcuts.map((menu, i) => (
              <StaggerItem key={menu.href} index={i}>
                <MenuShortcutCard menu={menu} highlight={highlight} />
              </StaggerItem>
            ))}
          </div>
        </section>
      ) : null}

      {currentState.status === "success" && urlState.type === "events" && eventResponse ? (
        <Pagination
          page={eventResponse.page}
          totalPages={eventResponse.totalPages}
          totalElements={eventResponse.totalElements}
          className="mt-10"
          onPageChange={(page) => onUpdate({ page })}
        />
      ) : null}

      {currentState.status === "success" && urlState.type === "posts" && postResponse ? (
        <Pagination
          page={postResponse.page}
          totalPages={postResponse.totalPages}
          totalElements={postResponse.totalElements}
          className="mt-10"
          onPageChange={(page) => onUpdate({ page })}
        />
      ) : null}

      {currentState.status === "success" && urlState.type === "users" && userResponse ? (
        <Pagination
          page={userResponse.page}
          totalPages={userResponse.totalPages}
          totalElements={userResponse.totalElements}
          className="mt-10"
          onPageChange={(page) => onUpdate({ page })}
        />
      ) : null}

      {currentState.status === "success" && urlState.type === "all" && !allEmpty ? (
        <p className="mt-10 text-center text-[12px] opacity-50" style={{ color: "var(--foreground)" }}>
          전체 검색은 행사·사역, 게시글, 사용자의 현재 페이지 결과를 각각 표시합니다.
        </p>
      ) : null}
    </>
  );
}

export type { ResultState };
