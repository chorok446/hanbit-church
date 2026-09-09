"use client";

import { useParams, usePathname } from "next/navigation";
import NotFound from "@/app/not-found";
import { EventDetailSession } from "./event-detail-session";

export default function EventNotFound() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  return typeof id === "string" && pathname === `/events/${encodeURIComponent(id)}` ? <EventDetailSession id={id} /> : <NotFound />;
}
