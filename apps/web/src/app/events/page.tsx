import { Suspense } from "react";
import EventListClient from "./event-list-client";
import { apiGetIsr } from "@/lib/api";
import type { EventSearchResponse } from "@/data/events";

// ISR: 기본 뷰(필터 없음·최신순·0페이지) 결과를 서버에서 선주입(60초 재검증) — SEO·LCP.
// API 미가용(CI 빌드)이면 null 로 두고 기존 클라이언트 fetch 경로가 동작한다.
export const revalidate = 60;

function EventListFallback() {
  return (
    <section className="min-h-screen bg-[var(--surface)] px-6 pb-20 pt-32 text-center text-[var(--foreground-muted)]">
      행사 검색 조건을 불러오는 중입니다.
    </section>
  );
}

export default async function EventListPage() {
  // 클라이언트 기본 요청과 동일한 파라미터(size=9·availableOnly=false·latest·page 0).
  const initialEvents = await apiGetIsr<EventSearchResponse>(
    "/api/events/search?availableOnly=false&sort=latest&page=0&size=9",
  );
  return (
    <Suspense fallback={<EventListFallback />}>
      <EventListClient initialResponse={initialEvents} />
    </Suspense>
  );
}
