"use client";

import { useCallback } from "react";
import { SessionDetail } from "@/components/session-detail";
import { apiGetOrNull } from "@/lib/api";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";
import NotFound from "@/app/not-found";
import PostDetailClient from "./post-detail-client";

export function PostDetailSession({ id, initialData }: { id: string; initialData?: { post: Post; linkedEvent: Event | null } }) {
  const load = useCallback(async () => {
    const post = await apiGetOrNull<Post>(`/api/posts/${encodeURIComponent(id)}`);
    if (!post) return null;
    const linkedEvent = post.eventId ? await apiGetOrNull<Event>(`/api/events/${encodeURIComponent(post.eventId)}`) : null;
    return { post, linkedEvent };
  }, [id]);
  return (
    <SessionDetail identity={`post:${id}`} initialData={initialData} load={load} fallback={<NotFound />}>
      {({ post, linkedEvent }) => <PostDetailClient post={post} linkedEvent={linkedEvent} />}
    </SessionDetail>
  );
}
