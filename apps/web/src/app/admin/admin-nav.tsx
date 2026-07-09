"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flag, Users, UserCheck, ScrollText, HeartHandshake } from "lucide-react";
import { useAdminProfile } from "./admin-guard";
import { getAdminPermissions, type AdminPermissions } from "./permissions";

// permission 이 지정된 탭은 해당 권한이 있어야 노출된다(대시보드는 항상 노출).
// TODO(콘텐츠 관리 탭: 전용 관리 페이지 필요) — 게시글·행사 전용 관리 페이지가 생기면
// canManageContent 권한 탭을 여기에 추가한다. 그 전까지는 대시보드의 빠른 작업·통계 카드가
// 공개 페이지(/news, /campaigns)와 글쓰기(/posts/new, /campaigns/new)로 연결한다.
const items: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: keyof AdminPermissions;
}[] = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/reports", label: "신고 관리", icon: Flag, permission: "canManageReports" },
  { href: "/admin/users", label: "회원 관리", icon: Users, permission: "canManageUsers" },
  { href: "/admin/approvals", label: "가입 승인", icon: UserCheck, permission: "canApproveSignups" },
  { href: "/admin/new-family", label: "새가족", icon: HeartHandshake, permission: "canManageNewFamily" },
  { href: "/admin/logs", label: "감사 로그", icon: ScrollText, permission: "canViewAuditLog" },
];

// 네이비 밴드 위 크림 텍스트. globals.css 에 --on-banner 토큰이 없어 네이비 위에서는 크림(#f6f3ea)만 리터럴로 사용한다.
const BANNER_CREAM = "#f6f3ea";
const BANNER_CREAM_MUTED = "rgba(246, 243, 234, 0.7)";
const BANNER_OUTLINE = "rgba(246, 243, 234, 0.3)";

/**
 * 관리자 상단 네이비 밴드 + 메뉴. 모든 /admin 하위 페이지 상단에 공유로 렌더된다.
 * 밴드는 풀블리드(px-6 pt-[124px] pb-11), 내부 콘텐츠는 max-w-5xl.
 */
export function AdminNav() {
  const pathname = usePathname();
  // AdminGuard 안에서만 렌더링되므로 profile 은 스태프로 확정된 상태다(재요청 없이 컨텍스트에서 읽는다).
  const profile = useAdminProfile();
  const permissions = getAdminPermissions(profile.role);
  const visible = items.filter(({ permission }) => !permission || permissions[permission]);

  return (
    <header
      className="relative overflow-hidden px-6 pb-11 pt-[124px]"
      style={{ background: "var(--banner-bg)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto w-full max-w-5xl">
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          Admin
        </p>
        <h1
          className="text-[32px] sm:text-[36px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: BANNER_CREAM }}
        >
          관리자
        </h1>
        <p className="mt-2.5 max-w-[52ch] text-[14px] leading-[26px]" style={{ color: BANNER_CREAM_MUTED }}>
          교회 홈페이지 운영 현황과 처리할 일을 한눈에 확인합니다.
        </p>
        <nav aria-label="관리자 메뉴" className="mt-7 flex flex-wrap gap-2">
          {visible.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] transition-colors"
                style={
                  active
                    ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--surface-dark)" }
                    : { background: "transparent", borderColor: BANNER_OUTLINE, color: BANNER_CREAM }
                }
              >
                <Icon size={14} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
