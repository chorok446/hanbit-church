import { Suspense } from "react";
import { apiGet } from "@/lib/api";
import type { EventSearchResponse } from "@/data/events";
import FeedClient from "./feed-client";

export default async function FeedPage() {
  const events = await apiGet<EventSearchResponse>(
    "/api/events/search?status=open&availableOnly=true&sort=popular&page=0&size=3",
  );
  return (
    <Suspense fallback={<FeedFallback />}>
      <FeedClient events={events.content} />
    </Suspense>
  );
}

function FeedFallback() {
  return (
    <section className="min-h-screen bg-[var(--surface)] px-6 pb-20 pt-32 text-center text-[var(--foreground-muted)]">
      피드 검색 조건을 불러오는 중입니다.
    </section>
  );
}
