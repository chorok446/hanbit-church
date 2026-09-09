"use client";

import { useCallback } from "react";
import { SessionDetail } from "@/components/session-detail";
import { apiGetOrNull } from "@/lib/api";
import type { Event } from "@/data/events";
import NotFound from "@/app/not-found";
import EventDetailClient from "./event-detail-client";

export function EventDetailSession({ id, initialData }: { id: string; initialData?: Event }) {
  const load = useCallback(() => apiGetOrNull<Event>(`/api/events/${encodeURIComponent(id)}`), [id]);
  return (
    <SessionDetail identity={`event:${id}`} initialData={initialData} load={load} fallback={<NotFound />}>
      {(event) => <EventDetailClient event={event} />}
    </SessionDetail>
  );
}
