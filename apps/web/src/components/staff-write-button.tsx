"use client";

import Link from "next/link";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { getAdminPermissions } from "@/app/admin/permissions";

/**
 * 소식·설교 목록 헤더의 스태프 전용 작성 버튼. 콘텐츠 관리 권한(canManageContent)이
 * 없으면 아무것도 렌더하지 않는다. 스타일은 행사 만들기 버튼(campaign-list-client)과 동일.
 */
export function StaffWriteButton({ href, label }: { href: string; label: string }) {
  const { profile } = useCurrentUserProfile();
  if (!getAdminPermissions(profile?.role).canManageContent) return null;
  return (
    <Link
      href={href}
      className="shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
    >
      + {label}
    </Link>
  );
}
