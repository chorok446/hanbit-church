"use client";

import { getAdminPermissions } from "@/app/admin/permissions";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn, RefreshCw } from "lucide-react";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { ActivitySummary } from "./activity-summary";
import { MyPostsGrid } from "./my-posts-grid";
import { SavedTabPanel } from "./saved-tab-panel";
import { UserEventsList } from "./joined-events-list";
import { ReportsList } from "./reports-list";
import { AccessLogsList } from "./access-logs-list";
import { MypageAccountPanel } from "./mypage-account-panel";
import { MypageProfileHeader } from "./mypage-profile-header";
import { MypageTabBar } from "./mypage-tab-bar";
import { DEFAULT_MYPAGE_TAB, parseMypageTab, type MypageTab } from "./mypage-types";
import { PageShell } from "@/components/page-shell";
import { StatePanel } from "@/components/ui/state-panel";

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

export default function MyPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, loading, error, isLoggedIn, retry } = useCurrentUserProfile();
  const [emailOverride, setEmailOverride] = useState<{ userId: number; email: string } | null>(null);
  const [savedEventPage, setSavedEventPage] = useState(0);

  // 개설 행사 탭 — 행사 개설 권한(최고 관리자·운영자·사역 담당자)과 동일 기준.
  const isAdmin = getAdminPermissions(profile?.role).canManageEvents;
  const requestedTab = parseMypageTab(searchParams.get("tab"));
  const tab = requestedTab === "created" && !isAdmin ? DEFAULT_MYPAGE_TAB : requestedTab;
  const page = parsePage(searchParams.get("page"));
  const displayedProfile = profile && emailOverride?.userId === profile.id
    ? { ...profile, email: emailOverride.email }
    : profile;

  const navigate = useCallback(
    (nextTab: MypageTab, nextPage: number) => {
      const params = new URLSearchParams();
      params.set("tab", nextTab);
      params.set("page", String(nextPage));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname],
  );

  const onSelectTab = useCallback((nextTab: MypageTab) => {
    if (nextTab !== "saved") setSavedEventPage(0);
    navigate(nextTab, 0);
  }, [navigate]);
  const onPageChange = useCallback((nextPage: number) => navigate(tab, nextPage), [navigate, tab]);

  return (
    <PageShell paddingClassName="relative min-h-screen overflow-hidden" orb="left">
      <div className="relative pb-20">
        {loading ? (
          <div className="px-6 pt-32">
            <StatePanel className="mx-auto min-h-72 max-w-3xl">
              <RefreshCw size={28} className="animate-spin text-[var(--accent)]" />
              <p>사용자 정보를 불러오는 중입니다.</p>
            </StatePanel>
          </div>
        ) : !isLoggedIn ? (
          <div className="px-6 pt-32">
            <StatePanel className="mx-auto min-h-72 max-w-3xl">
              <LogIn size={30} className="text-[var(--accent)]" />
              <p>마이페이지를 보려면 로그인이 필요합니다.</p>
              <Link href="/login" className="rounded-full cta-solid px-5 py-2 text-[13px]">
                로그인 페이지로 이동
              </Link>
            </StatePanel>
          </div>
        ) : error || !profile ? (
          <div className="px-6 pt-32">
            <StatePanel className="mx-auto min-h-72 max-w-3xl" role="alert">
              <p>{error || "사용자 정보를 불러오지 못했습니다."}</p>
              <button type="button" onClick={retry} className="rounded-full cta-solid px-5 py-2 text-[13px]">
                다시 시도
              </button>
            </StatePanel>
          </div>
        ) : (
          <>
            <MypageProfileHeader profile={displayedProfile ?? profile} />
            <ActivitySummary key={`summary-${profile.id}`} isAdmin={isAdmin} onSelectTab={onSelectTab} />
            <MypageTabBar tab={tab} isAdmin={isAdmin} onSelect={onSelectTab} />
            <div className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
              {tab === "posts" ? (
                <div role="tabpanel" id="mypage-panel-posts" aria-labelledby="mypage-tab-posts">
                  <MyPostsGrid page={page} onPageChange={onPageChange} />
                </div>
              ) : null}
              {tab === "events" ? (
                <div role="tabpanel" id="mypage-panel-events" aria-labelledby="mypage-tab-events">
                  <UserEventsList mode="joined" page={page} onPageChange={onPageChange} />
                </div>
              ) : null}
              {tab === "created" && isAdmin ? (
                <div role="tabpanel" id="mypage-panel-created" aria-labelledby="mypage-tab-created">
                  <UserEventsList mode="created" page={page} onPageChange={onPageChange} />
                </div>
              ) : null}
              {tab === "saved" ? (
                <div role="tabpanel" id="mypage-panel-saved" aria-labelledby="mypage-tab-saved">
                  <SavedTabPanel
                    page={page}
                    onPageChange={onPageChange}
                    eventPage={savedEventPage}
                    onEventPageChange={setSavedEventPage}
                  />
                </div>
              ) : null}
              {tab === "account" ? (
                <div role="tabpanel" id="mypage-panel-account" aria-labelledby="mypage-tab-account">
                  <MypageAccountPanel
                    currentEmail={(displayedProfile ?? profile).email}
                    profileName={profile.name}
                    twoFactorEnabled={profile.twoFactorEnabled ?? false}
                    onEmailChanged={(email) => setEmailOverride({ userId: profile.id, email })}
                  />
                </div>
              ) : null}
              {tab === "access" ? (
                <div role="tabpanel" id="mypage-panel-access" aria-labelledby="mypage-tab-access">
                  <AccessLogsList page={page} onPageChange={onPageChange} />
                </div>
              ) : null}
              {tab === "reports" ? (
                <div role="tabpanel" id="mypage-panel-reports" aria-labelledby="mypage-tab-reports">
                  <ReportsList page={page} onPageChange={onPageChange} />
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
