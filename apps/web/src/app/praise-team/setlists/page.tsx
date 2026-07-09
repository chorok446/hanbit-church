import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../praise-team-guard";
import { SetlistsClient } from "./setlists-client";

// 찬양팀 내부 콘티 목록 — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "콘티 목록",
  description: "찬양팀 콘티 목록 — 예배별 콘티와 상태",
  robots: { index: false, follow: false },
};

export default function SetlistsPage() {
  return (
    <PraiseTeamAccessGuard>
      <SetlistsClient />
    </PraiseTeamAccessGuard>
  );
}
