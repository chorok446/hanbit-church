"use client";

import { useCallback, type ReactNode } from "react";
import { SessionDetail } from "@/components/session-detail";
import { apiGetOrNull } from "@/lib/api";
import type { PublicUser } from "@/data/users";
import NotFound from "@/app/not-found";
import { UserProfileClient } from "./user-profile-client";

export function UserProfileSession({ id, initialData, fallback }: { id: string; initialData?: PublicUser; fallback: ReactNode }) {
  const load = useCallback(() => apiGetOrNull<PublicUser>(`/api/users/${encodeURIComponent(id)}`), [id]);
  return (
    <SessionDetail identity={`user:${id}`} initialData={initialData} load={load} fallback={fallback} notFoundFallback={<NotFound />}>
      {(user) => <UserProfileClient user={user} />}
    </SessionDetail>
  );
}
