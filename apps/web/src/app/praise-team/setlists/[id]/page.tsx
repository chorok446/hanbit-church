import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../../praise-team-guard";
import { SetlistDetailClient } from "./setlist-detail-client";

// 찬양팀 내부 콘티 상세 — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "콘티",
  description: "찬양팀 콘티 상세 — 곡 순서, 파트 배정, 참석 체크",
  robots: { index: false, follow: false },
};

export default async function SetlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PraiseTeamAccessGuard>
      <SetlistDetailClient setlistId={id} />
    </PraiseTeamAccessGuard>
  );
}
