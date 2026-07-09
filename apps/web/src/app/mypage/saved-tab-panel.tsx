"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListEmptyState } from "@/components/list-empty-state";
import { SkeletonCards } from "@/components/ui/skeleton-cards";
import { fetchBookmarkedPostsPage } from "@/data/posts";
import { fetchBookmarkedCampaignsPage } from "@/data/campaigns";
import { SavedPostsGrid } from "./saved-posts-grid";
import { SavedCampaignsGrid } from "./saved-campaigns-grid";

/**
 * 저장됨 탭. 글·행사 북마크가 모두 비어 있으면 통합 빈 상태 하나만 보여주고,
 * 하나라도 있으면 섹션별 그리드(각자 페이지네이션·저장 해제)를 렌더링한다.
 */
export function SavedTabPanel({
  page,
  onPageChange,
  campaignPage,
  onCampaignPageChange,
}: {
  page: number;
  onPageChange: (page: number) => void;
  campaignPage: number;
  onCampaignPageChange: (page: number) => void;
}) {
  // null = 확인 중. 확인 실패 시 섹션 그리드에 맡긴다(자체 오류·재시도 UI 보유).
  const [bothEmpty, setBothEmpty] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchBookmarkedPostsPage(0), fetchBookmarkedCampaignsPage(0)])
      .then(([posts, campaigns]) => {
        if (!alive) return;
        setBothEmpty(posts.totalElements === 0 && campaigns.totalElements === 0);
      })
      .catch(() => alive && setBothEmpty(false));
    return () => {
      alive = false;
    };
  }, []);

  if (bothEmpty === null) {
    return (
      <div aria-busy="true" aria-live="polite">
        <p className="sr-only">저장한 글과 행사를 불러오는 중입니다.</p>
        <SkeletonCards count={6} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    );
  }

  if (bothEmpty) {
    return (
      <ListEmptyState
        title="아직 저장한 글이나 행사가 없어요."
        action={
          <Link href="/feed" className="rounded-full bg-[var(--cta-bg)] px-5 py-2 text-[13px] font-medium text-[var(--cta-fg)]">
            교제 둘러보기
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-12">
      <section>
        <h2 className="mb-6 text-[15px] font-medium" style={{ color: "var(--foreground)" }}>
          저장한 게시글
        </h2>
        <SavedPostsGrid page={page} onPageChange={onPageChange} />
      </section>
      <section>
        <h2 className="mb-6 text-[15px] font-medium" style={{ color: "var(--foreground)" }}>
          저장한 행사
        </h2>
        <SavedCampaignsGrid page={campaignPage} onPageChange={onCampaignPageChange} />
      </section>
    </div>
  );
}
