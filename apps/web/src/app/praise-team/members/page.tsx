import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../praise-team-guard";
import { MembersClient } from "./members-client";

// 찬양팀 내부 팀원 목록 — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "찬양팀 팀원",
  description: "찬양팀 팀원 목록 — 역할과 파트",
  robots: { index: false, follow: false },
};

export default function PraiseMembersPage() {
  return (
    <PraiseTeamAccessGuard>
      <MembersClient />
    </PraiseTeamAccessGuard>
  );
}
