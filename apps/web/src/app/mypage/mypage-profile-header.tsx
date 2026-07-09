"use client";

import { getAdminPermissions } from "@/app/admin/permissions";

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

  return (
    <div className="mx-auto max-w-5xl px-6 pb-8 pt-28 sm:px-8 sm:pt-32">
      <div
        className="rounded-3xl border p-6 sm:p-8"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* 그림자 래퍼가 사각형이면 원형 아바타 뒤로 네모가 비친다 — rounded-full 필수 */}
          <div className="shrink-0 rounded-full shadow-[0_25px_55px_-20px_rgba(0,0,0,0.45)]">
            <Avatar
              name={profile.name}
              verified={profile.verified}
              size={96}
              src={profile.profileImageUrl ?? undefined}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="mb-2 text-[11px] tracking-[0.28em] uppercase"
              style={{ color: "var(--accent-secondary)" }}
            >
              My Page
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="break-words"
                style={{
                  fontFamily: "var(--font-display)", fontWeight: 600,
                  fontSize: "clamp(30px, 5vw, 40px)",
                  color: "var(--foreground)",
                }}
              >
                {profile.name}
              </h1>
              {/* TODO(권한: 사역 담당자 역할 도입 시 확장) — 현재는 USER/ADMIN 두 역할만 존재 */}
              {isAdmin ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] text-[var(--accent)]">
                  <ShieldCheck size={12} aria-hidden />
                  관리자
                </span>
              ) : profile.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] text-[var(--accent)]">
                  <CheckCircle2 size={12} aria-hidden />
                  후기 작성자
                </span>
              ) : (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px]"
                  style={{ background: "var(--badge-muted-bg)", color: "var(--foreground-muted)" }}
                >
                  일반 사용자
                </span>
              )}
            </div>
            <p className="mt-1 break-all text-[14px]" style={{ color: "var(--foreground-muted)" }}>
              {profile.email}
            </p>
            {/* IP는 프로필 헤더에서 노출하지 않는다 — 접속 기록 탭에서만(마스킹) 확인 */}
            {lastAccess ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                <Monitor size={13} aria-hidden />
                <span>
                  최근 접속: {formatAccessTime(lastAccess.accessedAt)} · {lastAccess.os}
                </span>
              </p>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              <Link
                href="/posts/new"
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-medium text-[var(--cta-fg)]"
                style={{ background: "var(--cta-bg)" }}
              >
                <PenLine size={13} aria-hidden />
                글쓰기
              </Link>
              {/* 행사 만들기는 관리자 전용. TODO(권한: 사역 담당자 역할 도입 시 확장) */}
              {isAdmin ? (
                <Link
                  href="/campaigns/new"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[12px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <Plus size={13} aria-hidden />
                  행사 만들기
                </Link>
              ) : null}
              {/* 찬양팀 멤버(praiseRole 보유자) 또는 최고 관리자(참관 가능)에게 바로가기를 노출한다. */}
              {profile.praiseRole || profile.role === "ADMIN" ? (
                <Link
                  href="/praise-team"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[12px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <Music size={13} aria-hidden style={{ color: "var(--accent)" }} />
                  찬양팀
                </Link>
              ) : null}
              <Link
                href="/profile/edit"
                className="inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <Pencil size={13} aria-hidden />
                프로필 편집
              </Link>
              <Link
                href={`/users/${profile.id}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-[12px]"
                style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
              >
                <UserRound size={13} aria-hidden />
                공개 프로필 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
