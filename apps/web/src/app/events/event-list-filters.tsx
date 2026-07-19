"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EventDateRangeFilterControls } from "@/components/event-date-range-filters";
import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { FilterPillGroup } from "@/components/filter-pill-group";
import { SearchField } from "@/components/search-field";
import {
  EMPTY_EVENT_DATE_RANGE_FILTERS,
  type EventDateRangeField,
  type EventRecruitState,
  type EventSearchSort,
  type EventStatus,
} from "@/data/events";
import type { EventListUrlState } from "@/lib/use-url-query";

export type EventListFilter = "all" | EventStatus;

const FILTER_ITEMS: { id: EventListFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "open", label: "모집중" },
  { id: "upcoming", label: "모집예정" },
  { id: "closed", label: "모집마감" },
];

const RECRUIT_STATE_LABELS: Record<EventRecruitState, string> = {
  before_recruit: "모집 예정",
  recruiting: "모집 중",
  ended: "모집 종료",
  closed: "마감",
};

export function eventHasActiveFilters(state: EventListUrlState): boolean {
  return !!(
    state.query
    || state.filter !== "all"
    || state.recruitState
    || state.availableOnly
    || state.recruitEndFrom
    || state.recruitEndTo
    || state.runStartFrom
    || state.runStartTo
  );
}

function buildEventFilterChips(
  state: EventListUrlState,
  onPatch: (changes: Partial<EventListUrlState>) => void,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.query) {
    chips.push({ id: "q", label: `검색: ${state.query}`, onRemove: () => onPatch({ query: "" }) });
  }
  if (state.filter !== "all") {
    const label = FILTER_ITEMS.find((item) => item.id === state.filter)?.label ?? state.filter;
    chips.push({ id: "status", label: `상태: ${label}`, onRemove: () => onPatch({ filter: "all" }) });
  }
  if (state.recruitState) {
    chips.push({
      id: "recruitState",
      label: `모집: ${RECRUIT_STATE_LABELS[state.recruitState]}`,
      onRemove: () => onPatch({ recruitState: null }),
    });
  }
  if (state.availableOnly) {
    chips.push({ id: "availableOnly", label: "참여 가능", onRemove: () => onPatch({ availableOnly: false }) });
  }
  if (state.recruitEndFrom || state.recruitEndTo) {
    chips.push({
      id: "recruitEnd",
      label: `모집 마감 ${state.recruitEndFrom || "…"}~${state.recruitEndTo || "…"}`,
      onRemove: () => onPatch({ recruitEndFrom: "", recruitEndTo: "" }),
    });
  }
  if (state.runStartFrom || state.runStartTo) {
    chips.push({
      id: "runStart",
      label: `진행 시작 ${state.runStartFrom || "…"}~${state.runStartTo || "…"}`,
      onRemove: () => onPatch({ runStartFrom: "", runStartTo: "" }),
    });
  }
  if (state.sort !== "latest") {
    const sortLabel = state.sort === "popular" ? "인기순" : "마감임박순";
    chips.push({ id: "sort", label: `정렬: ${sortLabel}`, onRemove: () => onPatch({ sort: "latest" }) });
  }
  return chips;
}

export function EventListFilters({
  state,
  loading,
  onFilter,
  onSearch,
  onSort,
  onRecruitState,
  onAvailableOnly,
  onDateChange,
  onClearDates,
  onPatch,
  onResetAll,
}: {
  state: EventListUrlState;
  loading: boolean;
  onFilter: (filter: EventListFilter) => void;
  onSearch: (query: string) => void;
  onSort: (sort: EventSearchSort) => void;
  onRecruitState: (recruitState: EventRecruitState | null) => void;
  onAvailableOnly: (checked: boolean) => void;
  onDateChange: (field: EventDateRangeField, value: string) => void;
  onClearDates: () => void;
  onPatch: (changes: Partial<EventListUrlState>) => void;
  onResetAll: () => void;
}) {
  const chips = buildEventFilterChips(state, (changes) => onPatch({ ...changes, page: 0 }));
  const hasDateFilters = !!(state.recruitEndFrom || state.recruitEndTo || state.runStartFrom || state.runStartTo);
  // 날짜 4개 필터는 사용 빈도가 낮아 "상세 필터" 접힘 영역으로 내린다. 활성 필터가 있으면 펼친 채로 시작.
  const [detailOpen, setDetailOpen] = useState(hasDateFilters);

  return (
    <div className="mb-8 space-y-4">
      <FilterPillGroup
        items={FILTER_ITEMS.map((item) => ({ key: item.id, label: item.label }))}
        value={state.filter}
        onChange={(key) => onFilter(key as EventListFilter)}
        label="행사 필터"
        className="w-full rounded-3xl md:w-fit md:rounded-full"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchField
          key={state.query}
          value={state.query}
          onCommit={onSearch}
          label="행사 검색"
          placeholder="행사 제목·요약 검색..."
          loading={loading}
          className="rounded-full"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px]">
            <span className="shrink-0 opacity-65">모집 상태</span>
            <select
              value={state.recruitState ?? ""}
              onChange={(event) => onRecruitState(
                event.target.value ? event.target.value as EventRecruitState : null,
              )}
              className="rounded-full border px-4 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
              onChange={(event) => onAvailableOnly(event.target.checked)}
              className="accent-[var(--accent-strong)]"
            />
            참여 가능
          </label>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="sr-only">정렬</span>
            <select
              value={state.sort}
              onChange={(event) => onSort(event.target.value as EventSearchSort)}
              className="rounded-full border px-4 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              style={{ color: "var(--foreground)", background: "var(--card)", borderColor: "var(--border)" }}
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
              <option value="deadline">마감임박순</option>
            </select>
          </label>
        </div>
      </div>
      <div>
        <button
          type="button"
          aria-expanded={detailOpen}
          onClick={() => setDetailOpen((open) => !open)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-[13px]"
          style={{ background: "rgba(var(--ink-rgb), 0.06)", color: "var(--foreground)" }}
        >
          <ChevronDown
            size={14}
            aria-hidden
            className={`transition-transform ${detailOpen ? "rotate-180" : ""}`}
          />
          상세 필터
          {hasDateFilters ? (
            <span
              aria-label="상세 필터 적용 중"
              className="ml-0.5 h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
          ) : null}
        </button>
        {detailOpen ? (
          <div className="mt-3">
            <EventDateRangeFilterControls
              value={state}
              onChange={onDateChange}
              onClear={onClearDates}
            />
          </div>
        ) : null}
      </div>
      <ActiveFilterChips chips={chips} onClearAll={chips.length > 0 ? onResetAll : undefined} />
    </div>
  );
}

export function parseEventListFilter(value: string | null): EventListFilter {
  return value === "open" || value === "upcoming" || value === "closed" ? value : "all";
}

export function parseEventListRecruitState(value: string | null): EventRecruitState | null {
  return value === "before_recruit" || value === "recruiting" || value === "ended" || value === "closed"
    ? value
    : null;
}

export function parseEventListSort(value: string | null): EventSearchSort {
  return value === "popular" || value === "deadline" ? value : "latest";
}

export { EMPTY_EVENT_DATE_RANGE_FILTERS };
