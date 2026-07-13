"use client";

import { Avatar } from "@/components/avatar";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";

/** 로그인 사용자 아바타 — 프로필 저장 후 PROFILE_EVENT 로 즉시 갱신된다. */
export function CurrentUserAvatar({ size = 32 }: { size?: number }) {
  const { profile } = useCurrentUserProfile();
  // 세션 마커 이름은 useSyncExternalStore 기반이라 SSR 스냅샷이 null →
  // 서버·hydration 첫 렌더 모두 "나" 로 일치해 이니셜 mismatch 가 없다.
  // (localStorage 를 이펙트+setState 로 읽던 mount 가드를 대체)
  const { name: sessionName } = useAuthSession();
  const name = profile?.name ?? sessionName ?? "나";
  return (
    <Avatar
      name={name}
      verified={profile?.verified}
      size={size}
      src={profile?.profileImageUrl ?? undefined}
    />
  );
}
