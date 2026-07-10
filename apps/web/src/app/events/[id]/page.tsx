import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiGetOrNullWithCookies } from "@/lib/api-server";
import type { Event } from "@/data/events";
import EventDetailClient from "./event-detail-client";
import { eventJsonLd, serializeJsonLd } from "@/lib/json-ld";

// generateMetadata 와 페이지 본문이 같은 요청 안에서 fetch 를 공유하도록 dedupe.
const getEvent = cache((id: string) => apiGetOrNullWithCookies<Event>(`/api/events/${id}`));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) return {};
  return {
    title: event.title,
    description: event.summary,
    openGraph: {
      title: event.title,
      description: event.summary,
      images: event.thumb ? [event.thumb] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  return (
    <>
      {/* 검색엔진 리치 스니펫용 구조화 데이터. serializeJsonLd 가 사용자 입력의 태그 주입을 막는다. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(eventJsonLd(event)) }} />
      <EventDetailClient event={event} />
    </>
  );
}
