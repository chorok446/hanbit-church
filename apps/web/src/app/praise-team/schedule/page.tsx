import type { Metadata } from "next";
import { PraiseTeamAccessGuard } from "../praise-team-guard";
import { ScheduleClient } from "./schedule-client";

// 찬양팀 내부 일정 — 검색 노출 안 함.
export const metadata: Metadata = {
  title: "찬양팀 일정",
  description: "찬양팀 일정 — 리허설, 연습, 예배 지원",
  robots: { index: false, follow: false },
};

export default function PraiseSchedulePage() {
  return (
    <PraiseTeamAccessGuard>
      <ScheduleClient />
    </PraiseTeamAccessGuard>
  );
}
