"use client";

import { getAdminPermissions, isStaffRole, USER_ROLE_LABELS, type UserRole } from "@/app/admin/permissions";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Monitor, Music, Pencil, PenLine, Plus, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { fetchAccessLogsPage, type AccessLogItem } from "@/data/access-logs";
import type { UserProfile } from "@/data/users";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatAccessTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

export function MypageProfileHeader({ profile }: { profile: UserProfile }) {
  const [lastAccess, setLastAccess] = useState<AccessLogItem | null>(null);
  const isAdmin = getAdminPermissions(profile.role).canManageEvents;

  useEffect(() => {
    let alive = true;
    fetchAccessLogsPage(0)
      .then((page) => alive && setLastAccess(page.content[0] ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 네이비 밴드 위 크림 텍스트는 중앙 토큰 var(--on-banner) / rgba(var(--on-banner-rgb), a) 를 쓴다.
  const cream = "var(--on-banner)";
  const creamMuted = "rgba(var(--on-banner-rgb), 0.72)";
  const creamFaint = "rgba(var(--on-banner-rgb), 0.55)";
  const creamBorder = "rgba(var(--on-banner-rgb), 0.3)";
  const outlineBtn =
    "inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[12px] font-medium transition-colors hover:bg-white/10";

  return (
    <div className="px-6 pb-12 pt-[120px]" style={{ background: "var(--banner-bg)" }}>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
        {/* 아바타 원 — 네이비 밴드 위에서 보이도록 밝은 크림 링을 두른다. */}
        <div
          className="shrink-0 rounded-full p-1"
          style={{ background: "rgba(var(--on-banner-rgb), 0.08)" }}
        >
          <Avatar
            name={profile.name}
            verified={profile.verified}
            size={96}
            src={profile.profileImageUrl ?? undefined}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[11px] tracking-[0.28em] uppercase" style={{ color: "var(--accent)" }}>
            My Page
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1
              className="break-words"
              style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: "clamp(30px, 5vw, 40px)",
                color: cream,
              }}
            >
              {profile.name}
            </h1>
            {/* 스태프 역할(관리자·운영자·사역·새가족·콘텐츠)은 역할명 배지로 표시한다. */}
            {isStaffRole(profile.role) ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                style={{ background: "rgba(var(--on-banner-rgb), 0.08)", color: cream }}
              >
                <ShieldCheck size={12} aria-hidden style={{ color: "var(--accent)" }} />
                {USER_ROLE_LABELS[profile.role as UserRole] ?? "관리자"}
              </span>
            ) : profile.verified ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                style={{ background: "rgba(var(--on-banner-rgb), 0.08)", color: cream }}
              >
                <CheckCircle2 size={12} aria-hidden style={{ color: "var(--accent)" }} />
                후기 작성자
              </span>
            ) : (
              <span
                className="rounded-full px-2.5 py-1 text-[11px]"
                style={{ background: "rgba(var(--on-banner-rgb), 0.08)", color: creamMuted }}
              >
                일반 사용자
              </span>
            )}
          </div>
          <p className="mt-1 break-all text-[14px]" style={{ color: creamMuted }}>
            {profile.email}
          </p>
          {/* IP는 프로필 헤더에서 노출하지 않는다 — 접속 기록 탭에서만(마스킹) 확인 */}
          {lastAccess ? (
            <p
              className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[12px] sm:justify-start"
              style={{ color: creamFaint }}
            >
              <Monitor size={13} aria-hidden />
              <span>
                최근 접속: {formatAccessTime(lastAccess.accessedAt)} · {lastAccess.os}
              </span>
            </p>
          ) : null}

          <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
            <Link
              href="/posts/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-90"
              style={{ background: cream, color: "var(--surface-deep)" }}
            >
              <PenLine size={13} aria-hidden />
              글쓰기
            </Link>
            {/* 행사 만들기 — canManageEvents(최고 관리자·운영자·사역 담당자). */}
            {isAdmin ? (
              <Link href="/events/new" className={outlineBtn} style={{ borderColor: creamBorder, color: cream }}>
                <Plus size={13} aria-hidden />
                행사 만들기
              </Link>
            ) : null}
            {/* 찬양팀 멤버(praiseRole 보유자) 또는 최고 관리자(참관 가능)에게 바로가기를 노출한다. */}
            {profile.praiseRole || profile.role === "ADMIN" ? (
              <Link href="/praise-team" className={outlineBtn} style={{ borderColor: creamBorder, color: cream }}>
                <Music size={13} aria-hidden style={{ color: "var(--accent)" }} />
                찬양팀
              </Link>
            ) : null}
            <Link href="/profile/edit" className={outlineBtn} style={{ borderColor: creamBorder, color: cream }}>
              <Pencil size={13} aria-hidden />
              프로필 편집
            </Link>
            <Link href={`/users/${profile.id}`} className={outlineBtn} style={{ borderColor: creamBorder, color: cream }}>
              <UserRound size={13} aria-hidden />
              공개 프로필 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
