import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "./praise-team-guard";
import { PraiseTeamDashboard } from "./praise-team-dashboard";

// 찬양팀 내부 운영 페이지 — 검색 노출 안 함(사이트 메뉴에도 노출하지 않는다).
export const metadata: Metadata = {
  title: "찬양팀",
  description: "찬양팀 내부 운영 — 콘티, 참석 체크, 공지, 일정",
  robots: { index: false, follow: false },
};

export default function PraiseTeamPage() {
  return (
    <PraiseTeamAccessGuard>
      <PraiseTeamDashboard />
    </PraiseTeamAccessGuard>
  );
}
