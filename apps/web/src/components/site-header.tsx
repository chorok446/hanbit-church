"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Search, ShieldCheck, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { useNotificationUnread } from "@/lib/use-unread-badges";
import { MAIN_NAV_ITEMS } from "@/lib/nav-items";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { CHURCH } from "@/data/church";
import { isStaffRole } from "@/app/admin/permissions";

// 로그아웃 시 머무르면 안 되는(인증 필요) 경로 prefix.
const PROTECTED_PREFIXES = ["/posts/new", "/events/new", "/mypage", "/profile/edit"];

/** 로그인 상태의 아바타 버튼 + 드롭다운(마이페이지 / 관리자 / 로그아웃). */
function ProfileMenu({
  name,
  isAdmin,
  onLogout,
}: {
  name: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClassName =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.07)]";

  return (
    <div ref={rootRef} className="relative">
      {/* 아바타가 버튼을 꽉 채운다 — 회색 원 안에 작은 원이 겹치면 이중 원처럼 어색하다. 열림 상태는 골드 링으로 표시. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none ${
          open ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]" : ""
        }`}
        aria-label="내 계정 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
      >
        <CurrentUserAvatar size={40} />
      </button>
      {open && (
        <div
          id="profile-menu"
          role="menu"
          aria-label="내 계정 메뉴"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 rounded-xl border p-1.5 shadow-[0_20px_45px_-18px_rgba(0,0,0,0.35)]"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <p
            className="truncate px-3 pb-2 pt-1.5 text-[12px] font-medium"
            style={{ color: "var(--foreground-muted)" }}
          >
            {name}
          </p>
          <Link
            href="/mypage"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={itemClassName}
            style={{ color: "var(--heading)" }}
          >
            <UserRound size={15} aria-hidden />
            마이페이지
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClassName}
              style={{ color: "var(--heading)" }}
            >
              <ShieldCheck size={15} aria-hidden />
              관리자
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className={itemClassName}
            style={{ color: "rgba(var(--ink-rgb), 0.8)" }}
          >
            <LogOut size={15} aria-hidden />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const onNotifications = pathname === "/notifications";
  const { isLoggedIn, name, logout, sessionId: token } = useAuthSession();
  // 관리자에게만 /admin 진입점을 보여준다(권한 자체는 서버가 검사).
  const { profile } = useCurrentUserProfile();
  const isAdmin = isStaffRole(profile?.role);
  const unread = useNotificationUnread(token);

  const onLogout = () => {
    void logout().finally(() => {
      if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) router.push("/feed");
    });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b transition-colors"
      style={{
        // 히어로 그라데이션이 비쳐도 로고/태그라인 대비 4.5:1을 지키는 최소 불투명도
        background: "rgba(var(--surface-rgb), 0.85)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap" style={{ color: "var(--accent-secondary)" }}>
          <span className="text-[17px] sm:text-[21px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{CHURCH.name}</span>
          <span className="hidden text-[10px] tracking-[0.3em] opacity-90 lg:inline">{CHURCH.nameEn}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-2" aria-label="주요 메뉴">
          {MAIN_NAV_ITEMS.map((it) => {
            const isActive = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            const className = "relative rounded-lg px-4 py-2 text-[14px] transition-opacity hover:opacity-100";
            const style = { color: "var(--heading)", opacity: isActive ? 1 : 0.7 };
            const dot = isActive && (
              <motion.div
                layoutId="navdot"
                className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            );
            return (
              <Link key={it.label} href={it.href} className={className} style={style} aria-current={isActive ? "page" : undefined}>
                {it.label}
                {dot}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/search"
            className="flex h-9 items-center justify-center gap-2 rounded-full px-3 transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none"
            style={{
              background: pathname === "/search" ? "var(--accent-soft)" : "rgba(var(--ink-rgb), 0.07)",
              color: pathname === "/search" ? "var(--accent-strong)" : "var(--heading)",
            }}
            aria-label="검색 페이지로 이동"
          >
            <Search size={16} />
            <span className="hidden xl:inline text-[12px]">검색</span>
          </Link>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none"
            style={{
              background: onNotifications
                ? "var(--accent-soft)"
                : "rgba(var(--ink-rgb), 0.07)",
              color: onNotifications ? "var(--accent-strong)" : "var(--heading)",
            }}
            aria-label={unread > 0 ? `알림, 읽지 않음 ${unread > 99 ? "99+" : unread}개` : "알림"}
            aria-current={onNotifications ? "page" : undefined}
          >
            <Bell size={18} aria-hidden />
            {isLoggedIn && unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold leading-none"
                style={{ background: "var(--danger-solid)", color: "var(--on-danger)" }}
                aria-hidden
              >
                {unread > 99 ? "99+" : unread}
              </motion.span>
            )}
          </Link>
          {/* 서버 스냅샷은 항상 로그아웃 상태 → 비로그인 뷰로 hydration, 이후 클라이언트에서 갱신. */}
          {isLoggedIn ? (
            <ProfileMenu name={name ?? "사용자"} isAdmin={isAdmin} onLogout={onLogout} />
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-white/10 sm:px-3"
                style={{ color: "rgba(var(--ink-rgb), 0.8)" }}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none sm:px-3"
                style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
