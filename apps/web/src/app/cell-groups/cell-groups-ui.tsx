"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// 네이비 밴드 위 크림 텍스트 토큰(찬양팀 밴드와 동일 값 재사용).
const BAND_CREAM = "var(--on-banner)";
const BAND_CREAM_MUTED = "rgba(var(--on-banner-rgb), 0.72)";

/** 골드 한 줄 라벨(눈썹 텍스트). */
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

/** 목장 페이지 상단 컴팩트 네이비 밴드 — eyebrow(골드) + h1(명조 크림) + subtitle. */
export function CellBand({
  eyebrow,
  title,
  subtitle,
  back,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
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
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1
            className="break-words"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "clamp(28px, 5vw, 38px)",
              color: BAND_CREAM,
            }}
          >
            {title}
          </h1>
          {action}
        </div>
        {subtitle ? (
          <p className="mt-3 text-[15px] leading-8" style={{ color: BAND_CREAM_MUTED }}>
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** 카드 컨테이너 + 명조 제목. */
export function CellCard({
  label,
  title,
  action,
  children,
  id,
}: {
  label?: string;
  title: string;
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
