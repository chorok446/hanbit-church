// 데일리 큐티(오늘의 말씀·묵상) — 백엔드 DevotionDtos 와 1:1.
// "use client" 가 아닌 서버 안전 모듈이라 서버 컴포넌트(ISR 선주입)와 클라이언트가 공유한다.

export type Devotion = {
  id: string;
  date: string; // YYYY-MM-DD (LocalDate)
  verseRef: string;
  verseText: string;
  meditation: string;
  authorName: string;
  comments: number;
  scheduled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DevotionSummary = {
  id: string;
  date: string;
  verseRef: string;
  verseText: string;
  excerpt: string;
  comments: number;
  scheduled: boolean;
};

export type DevotionPageResponse = {
  content: DevotionSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type DevotionComment = {
  id: string;
  authorName: string;
  text: string;
  createdAt: string;
  canDelete: boolean;
};

export const DEVOTION_PAGE_SIZE = 12;
export const TODAY_DEVOTION_PATH = "/api/devotions/today";

export function devotionListPath(page: number, size: number = DEVOTION_PAGE_SIZE): string {
  return `/api/devotions?page=${page}&size=${size}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * LocalDate("2026-07-20") → "2026년 7월 20일 (월)". 순수 날짜라 시간대 영향이 없다 —
 * UTC 정오로 파싱해 요일을 안정적으로 얻고, SSR·클라이언트가 같은 문자열을 낸다(로케일 무의존).
 */
export function devotionDateLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${y}년 ${m}월 ${day}일 (${WEEKDAYS[d.getUTCDay()]})`;
}

/** 짧은 라벨 "7.20 (월)" — 목록 카드용. */
export function devotionShortDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()} (${WEEKDAYS[d.getUTCDay()]})`;
}
