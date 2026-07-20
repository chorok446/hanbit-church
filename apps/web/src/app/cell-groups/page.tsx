import type { Metadata } from "next";
import { CellGroupGuard } from "./cell-group-guard";
import { CellGroupsDirectory } from "./cell-groups-client";

// 목장(소그룹) 디렉터리 — 로그인 교인 대상. 검색 노출은 하지 않는다.
export const metadata: Metadata = {
  title: "목장",
  description: "소그룹/목장(구역) — 로스터, 모임 일정, 모임기록(참석·나눔)",
  robots: { index: false, follow: false },
};

export default function CellGroupsPage() {
  return (
    <CellGroupGuard>
      <CellGroupsDirectory />
    </CellGroupGuard>
  );
}
