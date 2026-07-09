"use client";

import type { ReactNode } from "react";
import {
  ATTENDANCE_STATUS_LABELS,
  attendanceStatusStyle,
  SETLIST_STATUS_LABELS,
  type PraiseAttendanceStatus,
  type PraiseSetlistStatus,
} from "@/data/praise-team";

/** 참석 상태 배지 — 색은 data/praise-team.ts 의 토큰 매핑 단일 기준. */
export function AttendanceBadge({ status }: { status: PraiseAttendanceStatus }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={attendanceStatusStyle(status)}
    >
      {ATTENDANCE_STATUS_LABELS[status]}
    </span>
  );
}

/** 콘티 상태 배지 — 확정은 골드 소프트, 나머지는 칩 톤. */
export function SetlistStatusBadge({ status }: { status: PraiseSetlistStatus }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={
        status === "CONFIRMED"
          ? { background: "var(--accent-soft)", color: "var(--accent-strong)" }
          : { background: "var(--chip-bg)", color: "var(--foreground-muted)" }
      }
    >
      {SETLIST_STATUS_LABELS[status]}
    </span>
  );
}

/** 골드 한 줄 라벨(눈썹 텍스트) — 골드는 라벨·아이콘·구분선에만 쓴다는 규칙의 "라벨". */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.28em]"
      style={{ color: "var(--accent-strong)" }}
    >
      {children}
    </p>
  );
}

/** 카드 컨테이너 + 명조 제목. */
export function PraiseCard({
  label,
  title,
  action,
  children,
  id,
}: {
  label?: string;
  title: string;
  /** 제목 오른쪽 액션(배지·버튼). */
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl border p-5 sm:p-6"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <h2
          className="text-[20px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
