import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../../praise-team-guard";
import { NewSetlistClient } from "./new-setlist-client";

// 찬양팀 내부 콘티 작성(리더 전용) — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "새 콘티 작성",
  description: "찬양팀 콘티 작성 — 예배 정보, 곡 목록, 공지",
  robots: { index: false, follow: false },
};

export default function NewSetlistPage() {
  return (
    <PraiseTeamAccessGuard>
      <NewSetlistClient />
    </PraiseTeamAccessGuard>
  );
}
