"use client";

import { useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";

/**
 * 스태프 전용 작성 페이지 가드(/news/write, /sermons/write). admin-guard 와 같은 관례로
 * 비로그인은 로그인으로 보내고, 콘텐츠 관리 권한(canManageContent — 최고 관리자·운영자·
 * 콘텐츠 관리자)이 없으면 404 처리한다(경로 존재를 드러내지 않기 위해 403 대신 404).
 * 실제 작성 통제는 백엔드 PostCategory.STAFF_WRITE(서버 403)가 담당한다.
 */
export function StaffContentGuard({ next, children }: { next: string; children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading, error, isLoggedIn, retry } = useCurrentUserProfile();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [loading, isLoggedIn, router, next]);

  if (profile && !getAdminPermissions(profile.role).canManageContent) notFound();

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

  return <>{children}</>;
}
