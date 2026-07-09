"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  appendEventDateRangeFilters,
  type EventDateRangeFilters,
  type EventRecruitState,
  type EventSearchSort,
  type EventStatus,
} from "@/data/events";
import type { PostCategory, PostSearchSort } from "@/data/posts";

export type FeedUrlState = {
  query: string;
  eventOnly: boolean;
  /** null = 전체. */
  category: PostCategory | null;
  sort: PostSearchSort;
  page: number;
};

export type EventListView = "card" | "calendar";

export type EventListUrlState = EventDateRangeFilters & {
  query: string;
  filter: "all" | EventStatus;
  recruitState: EventRecruitState | null;
  availableOnly: boolean;
  sort: EventSearchSort;
  page: number;
  /** 목록 표시 형식 — 기본 카드, `?view=calendar` 딥링크로 캘린더 보기. */
  view: EventListView;
};

export function parseEventListView(value: string | null): EventListView {
  return value === "calendar" ? "calendar" : "card";
}

/** 피드 목록 URL을 canonical 형태로 만든다. */
export function buildFeedHref(state: FeedUrlState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.eventOnly) params.set("eventOnly", "true");
  if (state.category) params.set("category", state.category);
  params.set("sort", state.sort);
  params.set("page", state.page.toString());
  return `/feed?${params.toString()}`;
}

/** 행사 목록 URL을 canonical 형태로 만든다. */
export function buildEventsHref(state: EventListUrlState): string {
  const params = new URLSearchParams();
  if (state.view === "calendar") params.set("view", "calendar");
  if (state.query) params.set("q", state.query);
  if (state.filter !== "all") params.set("status", state.filter);
  if (state.recruitState) params.set("recruitState", state.recruitState);
  if (state.availableOnly) params.set("availableOnly", "true");
  appendEventDateRangeFilters(params, {
    recruitEndFrom: state.recruitEndFrom,
    recruitEndTo: state.recruitEndTo,
    runStartFrom: state.runStartFrom,
    runStartTo: state.runStartTo,
  });
  params.set("sort", state.sort);
  params.set("page", state.page.toString());
  return `/events?${params.toString()}`;
}

/** URL 쿼리를 canonical href로 정규화한다. */
export function useCanonicalUrl(canonicalHref: string, currentHref: string) {
  const router = useRouter();

  useEffect(() => {
    if (currentHref !== canonicalHref) router.replace(canonicalHref, { scroll: false });
  }, [canonicalHref, currentHref, router]);
}

export function parsePageParam(value: string | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}
