"use client";

import { useEffect, useState } from "react";
import { Bookmark, CalendarCheck, Megaphone, PenLine, type LucideIcon } from "lucide-react";
import { CountUp, StaggerItem } from "@/components/scroll-reveal";
import { fetchBookmarkedPostsPage, fetchMyPostsPage } from "@/data/posts";
import {
  fetchBookmarkedEventsPage,
  fetchJoinedEventsPage,
  fetchMyEventsPage,
} from "@/data/events";

import type { MypageTab } from "./mypage-types";

type SummaryTab = Extract<MypageTab, "posts" | "events" | "created" | "saved">;

type Counts = Record<SummaryTab, number>;

const TILES: { tab: SummaryTab; label: string; description: string; icon: LucideIcon; adminOnly?: boolean }[] = [
  { tab: "posts", label: "내 게시글", description: "내가 작성한 글", icon: PenLine },
  { tab: "events", label: "참여 행사", description: "참여 신청한 행사·사역", icon: CalendarCheck },
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
      fetchJoinedEventsPage(0),
      isAdmin ? fetchMyEventsPage(0) : Promise.resolve(null),
      fetchBookmarkedPostsPage(0),
      fetchBookmarkedEventsPage(0),
    ])
      .then(([posts, joined, created, savedPosts, savedEvents]) => {
        if (!alive) return;
        setCounts({
          posts: posts.totalElements,
          events: joined.totalElements,
          created: created?.totalElements ?? 0,
          saved: savedPosts.totalElements + savedEvents.totalElements,
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

  // 프로필 밴드 위로 겹치는(-mt-6) 흰 카드 오버랩 바. 열 사이 구분선(var(--border)).
  // 셀 사이 1px 구분선은 컨테이너 배경(border) 위에 gap 을 두어 표현한다.
  const cols = tiles.length >= 4 ? "min-[420px]:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3";
  return (
    <div className="mx-auto -mt-6 max-w-5xl px-6 sm:px-8">
      <div
        className={`grid grid-cols-1 gap-px overflow-hidden rounded-2xl border shadow-[0_20px_45px_-24px_rgba(31,42,68,0.35)] ${cols}`}
        style={{ background: bone, borderColor: bone }}
      >
        {tiles.map(({ tab, label, description, icon: Icon }, i) => (
          <StaggerItem key={tab} index={i} className="h-full">
            <button
              type="button"
              onClick={() => onSelectTab(tab)}
              aria-label={counts ? `${label} ${counts[tab]}개 보기` : `${label} 보기`}
              className="flex h-full w-full items-center gap-4 p-5 text-left transition-colors hover:bg-[var(--accent-soft)]"
              style={{ background: "var(--card)" }}
            >
              <div className="min-w-0 flex-1">
                {counts ? (
                  <p
                    style={{
                      fontFamily: "var(--font-display)", fontWeight: 600,
                      fontSize: "clamp(26px, 3vw, 30px)",
                      color: "var(--accent-strong)",
                      lineHeight: 1.1,
                    }}
                  >
                    <CountUp to={counts[tab]} />
                  </p>
                ) : (
                  <div className="h-7 w-14 animate-pulse rounded-full" style={{ background: bone }} />
                )}
                <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--heading)" }}>
                  {label}
                </p>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  {description}
                </p>
              </div>
              <Icon size={18} aria-hidden className="shrink-0 text-[var(--accent)]" />
            </button>
          </StaggerItem>
        ))}
      </div>
    </div>
  );
}
