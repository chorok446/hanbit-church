"use client";

import { createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import type { UserProfile } from "@/data/users";

const CellProfileContext = createContext<UserProfile | null>(null);

/** 가드 통과 후 하위에서 프로필을 재요청 없이 읽는다. */
export function useCellProfile(): UserProfile {
  const profile = useContext(CellProfileContext);
  if (!profile) throw new Error("useCellProfile 은 CellGroupGuard 하위에서만 사용할 수 있습니다.");
  return profile;
}

/**
 * 목장 페이지 가드 — 로그인만 요구한다(디렉터리는 모든 교인 대상).
 * 목장별 상세·편집 권한은 서버가 판정하고, 상세 응답의 canManage/canManageRoster 로 UI 를 게이트한다.
 */
export function CellGroupGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading, isLoggedIn, error, retry } = useCurrentUserProfile();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login?next=/cell-groups");
  }, [loading, isLoggedIn, router]);

  if (!profile) {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          {error ? (
            <>
              <p>{error}</p>
              <button
                type="button"
                onClick={retry}
                className="rounded-full border px-4 py-2 text-[13px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                다시 시도
              </button>
            </>
          ) : (
            <>
              <Loader2 className="animate-spin" size={20} aria-hidden />
              <p>불러오는 중입니다…</p>
            </>
          )}
        </StatePanel>
      </PageShell>
    );
  }

  return <CellProfileContext.Provider value={profile}>{children}</CellProfileContext.Provider>;
}
