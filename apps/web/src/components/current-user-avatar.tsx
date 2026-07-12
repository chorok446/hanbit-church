"use client";

import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { getName } from "@/lib/auth";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";

/** 로그인 사용자 아바타 — 프로필 저장 후 PROFILE_EVENT 로 즉시 갱신된다. */
export function CurrentUserAvatar({ size = 32 }: { size?: number }) {
  const { profile } = useCurrentUserProfile();
  // getName() 은 localStorage 라 SSR·hydration 첫 렌더에서 못 읽는다. mount 전에는 서버와
  // 동일한 기본값("나")을 써야 이니셜이 어긋나는 hydration mismatch 가 나지 않는다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const name = mounted ? profile?.name ?? getName() ?? "나" : "나";
  return (
    <Avatar
      name={name}
      verified={profile?.verified}
      size={size}
      src={profile?.profileImageUrl ?? undefined}
    />
  );
}
