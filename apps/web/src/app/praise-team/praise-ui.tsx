"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

// 네이비 밴드 위 크림 텍스트는 배너 관례(#f6f3ea / rgba(246,243,234,a)) 리터럴을 쓴다
// (--on-banner 토큰이 없으므로 mypage-profile-header 와 같은 값을 재사용).
const BAND_CREAM = "#f6f3ea";
const BAND_CREAM_MUTED = "rgba(246, 243, 234, 0.72)";
const BAND_CREAM_BORDER = "rgba(246, 243, 234, 0.3)";

/** 밴드 하단 nav pill — 아웃라인(크림 border) 또는 채움(크림 배경 + 네이비 텍스트). */
export function BandPill({
  href,
  filled,
  children,
}: {
  href: string;
  filled?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-opacity hover:opacity-90"
      style={
        filled
          ? { background: BAND_CREAM, color: "var(--surface-deep)" }
          : { border: `1px solid ${BAND_CREAM_BORDER}`, color: BAND_CREAM }
      }
    >
      {children}
    </Link>
  );
}

/**
 * 찬양팀 상단 "컴팩트 네이비 밴드" — 모든 찬양팀 페이지 상단에 공통으로 쓴다.
 * eyebrow(골드) + h1(명조 크림) + subtitle(뮤티드 크림) + 선택적 nav pill 메뉴.
 * pills 는 BandPill 로 구성한다(권한별 노출은 호출부에서 제어).
 */
export function PraiseBand({
  eyebrow,
  title,
  subtitle,
  back,
  pills,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  /** 좌상단 "찬양팀 홈" 등 돌아가기 링크(하위 페이지). */
  back?: { href: string; label: string };
  /** 밴드 하단 nav pill 묶음. */
  pills?: ReactNode;
}) {
  return (
    <div className="px-6 pt-[124px] pb-11" style={{ background: "var(--banner-bg)" }}>
      <div className="mx-auto max-w-[896px]">
        {back ? (
          <Link
            href={back.href}
            className="mb-4 inline-flex min-h-9 items-center gap-1.5 text-[13px] transition-opacity hover:opacity-80"
            style={{ color: BAND_CREAM_MUTED }}
          >
            <ArrowLeft size={14} aria-hidden />
            {back.label}
          </Link>
        ) : null}
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </p>
        <h1
          className="mt-2 break-words"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "clamp(28px, 5vw, 38px)",
            color: BAND_CREAM,
          }}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 text-[15px] leading-8" style={{ color: BAND_CREAM_MUTED }}>
            {subtitle}
          </p>
        ) : null}
        {pills ? <nav className="mt-5 flex flex-wrap gap-2" aria-label="찬양팀 메뉴">{pills}</nav> : null}
      </div>
    </div>
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
