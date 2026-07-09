"use client";

import { useEffect, useState } from "react";
import { Bookmark, CalendarCheck, Megaphone, PenLine, type LucideIcon } from "lucide-react";
import { CountUp, StaggerItem } from "@/components/scroll-reveal";
import { fetchBookmarkedPostsPage, fetchMyPostsPage } from "@/data/posts";
import {
  fetchBookmarkedCampaignsPage,
  fetchJoinedCampaignsPage,
  fetchMyCampaignsPage,
} from "@/data/campaigns";

import type { MypageTab } from "./mypage-types";

type SummaryTab = Extract<MypageTab, "posts" | "campaigns" | "created" | "saved">;

type Counts = Record<SummaryTab, number>;

const TILES: { tab: SummaryTab; label: string; description: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { tab: "posts", label: "내 게시글", description: "내가 작성한 글", icon: PenLine },
  { tab: "campaigns", label: "참여 행사", description: "참여 신청한 행사·사역", icon: CalendarCheck },
  // TODO(권한: 사역 담당자 역할 도입 시 확장) — 개설 행사는 현재 관리자 전용
  { tab: "created", label: "개설 행사", description: "내가 개설한 행사·사역", icon: Megaphone, adminOnly: true },
  { tab: "saved", label: "저장됨", description: "저장한 글과 행사", icon: Bookmark },
];

// 프로필 아래 활동 요약 KPI. 각 탭 fetcher의 totalElements만 사용(추가 API 없음).
export function ActivitySummary({
  isAdmin,
  onSelectTab,
}: {
  isAdmin: boolean;
  onSelectTab: (tab: SummaryTab) => void;
}) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchMyPostsPage(0),
      fetchJoinedCampaignsPage(0),
      isAdmin ? fetchMyCampaignsPage(0) : Promise.resolve(null),
      fetchBookmarkedPostsPage(0),
      fetchBookmarkedCampaignsPage(0),
    ])
      .then(([posts, joined, created, savedPosts, savedCampaigns]) => {
        if (!alive) return;
        setCounts({
          posts: posts.totalElements,
          campaigns: joined.totalElements,
          created: created?.totalElements ?? 0,
          saved: savedPosts.totalElements + savedCampaigns.totalElements,
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  // ponytail: 요약은 부가 정보 — 실패 시 조용히 숨기고 탭 목록이 본 역할을 한다.
  if (failed) return null;

  const bone = "var(--border)";
  const tiles = TILES.filter((tile) => !tile.adminOnly || isAdmin);

  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-8">
      <p className="mb-3 text-[11px] tracking-[0.24em] uppercase" style={{ color: "var(--foreground-muted)" }}>
        활동 요약
      </p>
      <div
        className={`grid grid-cols-1 gap-3 pb-8 min-[420px]:grid-cols-2 ${
          tiles.length === 4 ? "lg:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
      {tiles.map(({ tab, label, description, icon: Icon }, i) => (
        <StaggerItem key={tab} index={i}>
          <button
            type="button"
            onClick={() => onSelectTab(tab)}
            aria-label={counts ? `${label} ${counts[tab]}개 보기` : `${label} 보기`}
            className="w-full rounded-2xl border p-5 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
            style={{
              background: "var(--glass)",
              borderColor: bone,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              {counts ? (
                <p
                  style={{
                    fontFamily: "var(--font-display)", fontWeight: 600,
                    fontSize: "clamp(26px, 3vw, 34px)",
                    color: "var(--accent)",
                    lineHeight: 1.1,
                  }}
                >
                  <CountUp to={counts[tab]} />
                </p>
              ) : (
                <div className="h-8 w-14 animate-pulse rounded-full" style={{ background: bone }} />
              )}
              <Icon size={16} aria-hidden className="mt-1 shrink-0 text-[var(--accent)]" />
            </div>
            <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
              {label}
            </p>
            <p className="mt-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {description}
            </p>
          </button>
        </StaggerItem>
      ))}
      </div>
    </div>
  );
}
