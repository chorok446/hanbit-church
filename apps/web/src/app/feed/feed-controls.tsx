"use client";

import { ActiveFilterChips, type FilterChip } from "@/components/active-filter-chips";
import { SearchField } from "@/components/search-field";
import { postCategoryLabel, type PostSearchSort } from "@/data/posts";
import type { FeedUrlState } from "@/lib/use-url-query";

const POST_SORT_LABELS: Record<PostSearchSort, string> = {
  latest: "최신순",
  relevance: "관련순",
  popular: "인기순",
  discussed: "댓글순",
};

export function feedHasActiveFilters(state: FeedUrlState): boolean {
  return !!(state.query || state.eventOnly || state.category || state.sort !== "latest");
}

function buildFeedFilterChips(state: FeedUrlState, onPatch: (changes: Partial<FeedUrlState>) => void): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.query) {
    chips.push({
      id: "q",
      label: `검색: ${state.query}`,
      onRemove: () => onPatch({ query: "" }),
    });
  }
  if (state.eventOnly) {
    chips.push({
      id: "eventOnly",
      label: "행사 게시글만",
      onRemove: () => onPatch({ eventOnly: false }),
    });
  }
  if (state.category) {
    chips.push({
      id: "category",
      label: `카테고리: ${postCategoryLabel(state.category)}`,
      onRemove: () => onPatch({ category: null }),
    });
  }
  if (state.sort !== "latest") {
    chips.push({
      id: "sort",
      label: `정렬: ${POST_SORT_LABELS[state.sort]}`,
      onRemove: () => onPatch({ sort: "latest" }),
    });
  }
  return chips;
}

export function FeedControls({
  state,
  loading,
  onSearch,
  onSort,
  onEventOnly,
  onPatch,
  onResetAll,
}: {
  state: FeedUrlState;
  loading: boolean;
  onSearch: (query: string) => void;
  onSort: (sort: PostSearchSort) => void;
  onEventOnly: (checked: boolean) => void;
  onPatch: (changes: Partial<FeedUrlState>) => void;
  onResetAll: () => void;
}) {
  const chips = buildFeedFilterChips(state, (changes) => onPatch({ ...changes, page: 0 }));

  return (
    <div className="mb-6 flex flex-col gap-3">
      <SearchField
        key={state.query}
        value={state.query}
        onCommit={onSearch}
        label="게시글 검색"
        placeholder="본문 또는 작성자 검색..."
        loading={loading}
        className="rounded-full"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label
          className="flex min-h-10 items-center gap-2 rounded-full px-4 py-2.5 text-[13px]"
          style={{ background: "rgba(var(--ink-rgb), 0.06)" }}
        >
          <input
            type="checkbox"
            checked={state.eventOnly}
            onChange={(event) => onEventOnly(event.target.checked)}
            className="accent-[var(--accent-strong)]"
          />
          행사 게시글만
        </label>
        <label className="ml-auto flex min-h-10 items-center gap-2 text-[13px]">
          <span className="sr-only">게시글 정렬</span>
          <select
            value={state.sort}
            onChange={(event) => onSort(event.target.value as PostSearchSort)}
            className="rounded-full border px-4 py-2.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{
              color: "var(--foreground)",
              background: "var(--panel)",
              borderColor: "rgba(var(--ink-rgb), 0.12)",
            }}
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
            <option value="discussed">댓글순</option>
          </select>
        </label>
      </div>
      <ActiveFilterChips chips={chips} onClearAll={chips.length > 0 ? onResetAll : undefined} />
    </div>
  );
}
