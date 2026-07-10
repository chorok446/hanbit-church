import { Suspense } from "react";
import EventListClient from "./event-list-client";

function EventListFallback() {
  return (
    <section className="min-h-screen bg-[var(--surface)] px-6 pb-20 pt-32 text-center text-[var(--foreground-muted)]">
      행사 검색 조건을 불러오는 중입니다.
    </section>
  );
}

export default function EventListPage() {
  return (
    <Suspense fallback={<EventListFallback />}>
      <EventListClient />
    </Suspense>
  );
}
