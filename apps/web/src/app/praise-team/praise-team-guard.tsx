"use client";

import { createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Music } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import type { UserProfile } from "@/data/users";

const PraiseProfileContext = createContext<UserProfile | null>(null);

/** 가드 통과 후 하위 페이지에서 프로필을 재요청 없이 읽는다(가드 안에서만 사용). */
export function usePraiseProfile(): UserProfile {
  const profile = useContext(PraiseProfileContext);
  if (!profile) {
    throw new Error("usePraiseProfile 은 PraiseTeamAccessGuard 하위에서만 사용할 수 있습니다.");
  }
  return profile;
}

/**
 * 찬양팀 내부 페이지 가드. 비로그인은 로그인으로 보내고,
 * 찬양팀 역할(praiseRole)이 없으면 접근 제한 안내 카드를 보여준다
 * (관리자 문의를 유도해야 하므로 admin-guard 와 달리 404 로 숨기지 않는다).
 * 사이트 최고 관리자(ADMIN)는 운영 확인을 위해 praiseRole 없이도 허용한다.
 */
export function PraiseTeamAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading, error, isLoggedIn, retry } = useCurrentUserProfile();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login?next=/praise-team");
  }, [loading, isLoggedIn, router]);

  if (profile && !profile.praiseRole && profile.role !== "ADMIN") {
    return (
      <PageShell orb="none">
        <StatePanel className="mx-auto max-w-xl">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            <Music size={20} aria-hidden />
          </span>
          <p
            className="text-[18px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            찬양팀 멤버 전용 페이지입니다
          </p>
          <p className="max-w-[38ch] leading-7" style={{ color: "var(--foreground-muted)" }}>
            찬양팀 내부 페이지는 찬양팀 멤버만 이용할 수 있습니다. 접근 권한이 필요하면 관리자
            또는 찬양팀 리더에게 문의해 주세요.
          </p>
          <Link
            href="/"
            className="rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            홈으로 돌아가기
          </Link>
        </StatePanel>
      </PageShell>
    );
  }

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
              <p>권한을 확인하는 중입니다…</p>
            </>
          )}
        </StatePanel>
      </PageShell>
    );
  }

  return <PraiseProfileContext.Provider value={profile}>{children}</PraiseProfileContext.Provider>;
}
