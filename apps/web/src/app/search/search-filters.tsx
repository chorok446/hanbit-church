"use client";

import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { EventDateRangeFilterControls } from "@/components/event-date-range-filters";
import { SearchField } from "@/components/search-field";
import {
  EMPTY_EVENT_DATE_RANGE_FILTERS,
  appendEventDateRangeFilters,
  type EventDateRangeFilters,
  type EventRecruitState,
} from "@/data/events";

export type SearchType = "all" | "events" | "posts" | "users";
export type SearchSort = "latest" | "popular" | "deadline" | "relevance";

export type SearchUrlState = EventDateRangeFilters & {
  query: string;
  type: SearchType;
  sort: SearchSort;
  recruitState: EventRecruitState | null;
  availableOnly: boolean;
  // 게시글 태그 필터(예: "#청바지업사이클"). posts/all 타입에서만 유효.
  tag: string;
  page: number;
};

const TYPE_TABS: { id: SearchType; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "events", label: "행사·사역" },
  { id: "posts", label: "게시글" },
  { id: "users", label: "사용자" },
];

/** 검색어가 있을 때 탭에 표기하는 도메인별 결과 개수(totalElements). */
export type SearchTabCounts = {
  events: number;
  posts: number;
  users: number;
};

const RECRUIT_LABELS: Record<EventRecruitState, string> = {
  before_recruit: "모집 예정",
  recruiting: "모집 중",
  ended: "모집 종료",
  closed: "마감",
};

export function searchHasActiveFilters(state: SearchUrlState): boolean {
  return !!(
    state.query
    || state.type !== "all"
    || state.sort !== "latest"
    || state.recruitState
    || state.availableOnly
    || state.tag
    || state.recruitEndFrom
    || state.recruitEndTo
    || state.runStartFrom
    || state.runStartTo
  );
}

export function buildSearchFilterChips(
  state: SearchUrlState,
  onPatch: (changes: Partial<SearchUrlState>) => void,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.query) chips.push({ id: "q", label: `검색: ${state.query}`, onRemove: () => onPatch({ query: "" }) });
  if (state.type !== "all") {
    const label = TYPE_TABS.find((tab) => tab.id === state.type)?.label ?? state.type;
    chips.push({ id: "type", label: `유형: ${label}`, onRemove: () => onPatch({ type: "all" }) });
  }
  if (state.sort !== "latest") {
    const sortLabel = state.sort === "popular" ? "인기순" : "마감임박순";
    chips.push({ id: "sort", label: `정렬: ${sortLabel}`, onRemove: () => onPatch({ sort: "latest" }) });
  }
  if (state.tag) {
    chips.push({ id: "tag", label: `태그: ${state.tag}`, onRemove: () => onPatch({ tag: "" }) });
  }
  if (state.type === "events") {
    if (state.recruitState) {
      chips.push({ id: "rs", label: `모집: ${RECRUIT_LABELS[state.recruitState]}`, onRemove: () => onPatch({ recruitState: null }) });
    }
    if (state.availableOnly) {
      chips.push({ id: "av", label: "참여 가능", onRemove: () => onPatch({ availableOnly: false }) });
    }
  }
  return chips;
}

export function SearchFilters({
  state,
  loading,
  counts = null,
  canSearchUsers = false,
  onUpdate,
  onReset,
}: {
  state: SearchUrlState;
  loading: boolean;
  counts?: SearchTabCounts | null;
  /** 사용자 탭 노출 여부 — 전체 회원 검색은 회원 관리 권한자(관리자) 전용. */
  canSearchUsers?: boolean;
  onUpdate: (changes: Partial<SearchUrlState>, replace?: boolean) => void;
  onReset: () => void;
}) {
  const filterChips = buildSearchFilterChips(state, (changes) => onUpdate({ ...changes, page: 0 }));
  const tabs = canSearchUsers ? TYPE_TABS : TYPE_TABS.filter((tab) => tab.id !== "users");

  return (
    <div className="mx-auto mb-8 max-w-3xl space-y-4">
      <SearchField
        key={state.query}
        value={state.query}
        onCommit={(query) => onUpdate({ query: query.slice(0, 100), page: 0 }, true)}
        label="통합 검색"
        placeholder={canSearchUsers ? "행사, 게시글, 사용자를 검색해보세요." : "행사, 게시글을 검색해보세요."}
        loading={loading}
        className="rounded-full"
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 모바일에서는 가로 스크롤 대신 줄바꿈으로 탭을 배치한다. */}
        <div
          className="flex flex-wrap gap-1 rounded-2xl p-1"
          style={{ background: "rgba(var(--ink-rgb), 0.06)" }}
        >
          {tabs.map((tab) => {
            const active = state.type === tab.id;
            const count = counts
              ? tab.id === "all"
                ? counts.events + counts.posts + (canSearchUsers ? counts.users : 0)
                : counts[tab.id]
              : null;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdate({ type: tab.id, page: 0 })}
                className="shrink-0 rounded-full px-4 py-2 text-[13px] sm:px-5"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--surface-dark)" : "var(--foreground-muted)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {tab.label}
                {count !== null ? (
                  <span className="ml-1.5 text-[11px] opacity-75">{count.toLocaleString()}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        {state.type !== "users" ? (
          <label className="flex items-center gap-2 self-end text-[13px] sm:self-auto">
            <span className="sr-only">검색 결과 정렬</span>
            <select
              value={state.sort}
              onChange={(event) => onUpdate({ sort: event.target.value as SearchSort, page: 0 })}
              className="rounded-full border px-4 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{ color: "var(--foreground)", background: "var(--card)", borderColor: "var(--border)" }}
            >
              <option value="latest">최신순</option>
              {/* 관련순 — 검색어 위치 기반 백엔드 정렬(sort=relevance). 검색어가 없으면 최신순과 같다. */}
              <option value="relevance">관련순</option>
              <option value="popular">인기순</option>
              {state.type === "events" ? <option value="deadline">마감임박순</option> : null}
            </select>
          </label>
        ) : null}
      </div>
      {state.type === "events" ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-[13px] sm:flex-none">
              <span className="shrink-0 opacity-65">모집 상태</span>
              <select
                value={state.recruitState ?? ""}
                onChange={(event) => onUpdate({
                  recruitState: event.target.value ? event.target.value as EventRecruitState : null,
                  page: 0,
                })}
                className="min-w-0 rounded-full border px-4 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                style={{ color: "var(--foreground)", background: "var(--card)", borderColor: "var(--border)" }}
              >
                <option value="">전체</option>
                <option value="before_recruit">모집 예정</option>
                <option value="recruiting">모집 중</option>
                <option value="ended">모집 종료</option>
                <option value="closed">마감</option>
              </select>
            </label>
            <label
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px]"
              style={{ background: "rgba(var(--ink-rgb), 0.06)" }}
            >
              <input
                type="checkbox"
                checked={state.availableOnly}
                onChange={(event) => onUpdate({ availableOnly: event.target.checked, page: 0 })}
                className="accent-[var(--accent-strong)]"
              />
              참여 가능
            </label>
          </div>
          <EventDateRangeFilterControls
            value={state}
            onChange={(field, value) => onUpdate({ [field]: value, page: 0 })}
            onClear={() => onUpdate({ ...EMPTY_EVENT_DATE_RANGE_FILTERS, page: 0 })}
          />
        </>
      ) : null}
      <ActiveFilterChips chips={filterChips} onClearAll={filterChips.length > 0 ? onReset : undefined} />
    </div>
  );
}

export function parseSearchType(value: string | null): SearchType {
  return value === "events" || value === "posts" || value === "users" ? value : "all";
}

export function parseSearchSort(value: string | null, type: SearchType): SearchSort {
  if (type === "users") return "latest";
  if (value === "popular") return "popular";
  if (value === "relevance") return "relevance";
  if (value === "deadline" && type === "events") return "deadline";
  return "latest";
}

export function parseSearchRecruitState(value: string | null): EventRecruitState | null {
  return value === "before_recruit" || value === "recruiting" || value === "ended" || value === "closed"
    ? value
    : null;
}

export function parseSearchTag(value: string | null, type: SearchType): string {
  if (type !== "all" && type !== "posts") return "";
  return (value ?? "").trim().slice(0, 100);
}

export function buildSearchHref(state: SearchUrlState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  params.set("type", state.type);
  params.set("sort", state.sort);
  if ((state.type === "all" || state.type === "posts") && state.tag) params.set("tag", state.tag);
  if (state.type === "events") {
    if (state.recruitState) params.set("recruitState", state.recruitState);
    if (state.availableOnly) params.set("availableOnly", "true");
    appendEventDateRangeFilters(params, {
      recruitEndFrom: state.recruitEndFrom,
      recruitEndTo: state.recruitEndTo,
      runStartFrom: state.runStartFrom,
      runStartTo: state.runStartTo,
    });
  }
  params.set("page", state.page.toString());
  return `/search?${params.toString()}`;
}
