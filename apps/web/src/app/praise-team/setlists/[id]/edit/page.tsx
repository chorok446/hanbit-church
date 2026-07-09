import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../../../praise-team-guard";
import { EditSetlistClient } from "./edit-setlist-client";

// 찬양팀 내부 콘티 수정(리더 전용) — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "콘티 수정",
  description: "찬양팀 콘티 수정 — 예배 정보, 곡 목록, 공지, 파트 배정",
  robots: { index: false, follow: false },
};

export default async function EditSetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PraiseTeamAccessGuard>
      <EditSetlistClient setlistId={id} />
    </PraiseTeamAccessGuard>
  );
}
