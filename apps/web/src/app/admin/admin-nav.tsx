"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Flag, Users, UserCheck, ScrollText, HeartHandshake } from "lucide-react";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
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

export function AdminNav() {
  const pathname = usePathname();
  // AdminGuard 안에서만 렌더링되므로 profile 은 ADMIN 으로 확정된 상태다.
  const { profile } = useCurrentUserProfile();
  const permissions = getAdminPermissions(profile?.role);
  const visible = items.filter(({ permission }) => !permission || permissions[permission]);

  return (
    <header className="mb-8">
      <p className="mb-2 text-[11px] uppercase tracking-[0.4em]" style={{ color: "var(--accent-secondary)" }}>
        Admin
      </p>
      <h1
        className="text-[32px]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}
      >
        관리자
      </h1>
      <p className="mb-6 mt-1 text-[13.5px]" style={{ color: "var(--foreground-muted)" }}>
        교회 홈페이지 운영 현황과 처리할 일을 한눈에 확인합니다.
      </p>
      <nav aria-label="관리자 메뉴" className="flex flex-wrap gap-2">
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
                  : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }
              }
            >
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
