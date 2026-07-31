"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { useNotificationUnread } from "@/lib/use-unread-badges";
import { HOME_NAV_ITEM, NAV_GROUPS, type NavItem } from "@/lib/nav-items";
import { CurrentUserAvatar } from "@/components/current-user-avatar";
import { ThemeToggleMenuRow } from "@/components/theme-toggle";
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
        className={`flex h-11 w-11 items-center justify-center overflow-hidden rounded-full transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none ${
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

function renderDesktopLink(it: NavItem, pathname: string) {
  const isActive = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
  return (
    <Link
      key={it.href}
      href={it.href}
      className="relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[14px] transition-opacity hover:opacity-100"
      style={{ color: "var(--heading)", opacity: isActive ? 1 : 0.7 }}
      aria-current={isActive ? "page" : undefined}
    >
      {it.label}
      {/* 활성 nav 점 — layoutId 슬라이드 대신 활성 링크에 즉시 페이드 등장(.indicator-fade). */}
      {isActive && (
        <span
          className="indicator-fade absolute left-1/2 -translate-x-1/2 bottom-1 w-1.5 h-1.5 rounded-full"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />
      )}
    </Link>
  );
}

function renderSheetLink(it: NavItem, pathname: string, onClose: () => void) {
  const isActive = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
  return (
    <Link
      key={it.href}
      href={it.href}
      onClick={onClose}
      aria-current={isActive ? "page" : undefined}
      className="flex min-h-12 items-center justify-between rounded-xl px-3 text-[15px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.06)]"
      style={{ color: "var(--heading)", fontWeight: isActive ? 600 : 400 }}
    >
      {it.label}
      {isActive && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} aria-hidden />}
    </Link>
  );
}

/** 모바일(<lg) 전체 메뉴 시트 — 데스크톱 주 메뉴 11개가 숨는 구간의 상시 내비게이션. */
function MobileMenuSheet({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // 시트가 열린 동안 배경 스크롤을 잠근다.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  // 헤더의 backdrop-filter 가 fixed 자손의 containing block 이 되어 시트가 헤더 높이로 잘린다 — body 포털로 탈출.
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fade-in absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="전체 메뉴"
        tabIndex={-1}
        className="sheet-panel-in absolute right-0 top-0 flex h-full w-[300px] max-w-[85vw] flex-col overflow-y-auto border-l p-5 outline-none"
        style={{
          background: "var(--panel)",
          borderColor: "var(--border)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[15px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
            메뉴
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[rgba(var(--ink-rgb),0.1)]"
            style={{ background: "rgba(var(--ink-rgb), 0.06)", color: "var(--heading)" }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <nav aria-label="전체 메뉴" className="mt-4 flex flex-col">
          {renderSheetLink(HOME_NAV_ITEM, pathname, onClose)}
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mt-3">
              <p className="px-3 pb-1 text-[12px] font-semibold" style={{ color: "var(--accent-strong)" }}>
                {group.title}
              </p>
              {group.items.map((it) => renderSheetLink(it, pathname, onClose))}
            </div>
          ))}
        </nav>
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <ThemeToggleMenuRow />
        </div>
      </div>
    </div>,
    document.body,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenu = () => {
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

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
          <span className="hidden text-[10px] tracking-[0.3em] opacity-90 xl:inline">{CHURCH.nameEn}</span>
        </Link>
        {/* 11개 항목 + 로고·아이콘이 max-w-7xl 안에서 줄바꿈 없이 맞아야 한다 — md 태블릿은 모바일 하단 내비로. */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="주요 메뉴">
          {renderDesktopLink(HOME_NAV_ITEM, pathname)}
          {NAV_GROUPS.map((group) => (
            <Fragment key={group.title}>
              {/* 그룹 구분자 — 11개 평면 나열의 인지 부하를 방문자/콘텐츠/교인 3덩이로 나눈다.
                  xl 미만(1024~1280px)에서는 숨긴다 — 구분자 3개(~40px)가 lg 한 줄 폭 예산을 침식한다. */}
              <span aria-hidden className="mx-0.5 hidden h-3.5 w-px shrink-0 xl:block" style={{ background: "var(--border)" }} />
              {group.items.map((it) => renderDesktopLink(it, pathname))}
            </Fragment>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 알림 벨은 로그인 사용자에게만 — 방문자 표면에서는 로그인 요구로 이어지는 무의미한 타깃이다.
              서버 스냅샷(로그아웃)에서 hydration 후 뒤늦게 마운트되므로 클러스터 맨 앞에 둔다 —
              우측 정렬 클러스터는 맨 앞 삽입 시 기존 버튼(검색·프로필)의 위치가 움직이지 않는다. */}
          {isLoggedIn && (
            <Link
              href="/notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none"
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
              {unread > 0 && (
                <span
                  className="badge-pop absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold leading-none"
                  style={{ background: "var(--danger-solid)", color: "var(--on-danger)" }}
                  aria-hidden
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          )}
          <Link
            href="/search"
            className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 transition-[background-color,color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none"
            style={{
              background: pathname === "/search" ? "var(--accent-soft)" : "rgba(var(--ink-rgb), 0.07)",
              color: pathname === "/search" ? "var(--accent-strong)" : "var(--heading)",
            }}
            aria-label="검색 페이지로 이동"
          >
            <Search size={16} className="shrink-0" />
            <span className="hidden whitespace-nowrap text-[12px] xl:inline">검색</span>
          </Link>
          {/* 서버 스냅샷은 항상 로그아웃 상태 → 비로그인 뷰로 hydration, 이후 클라이언트에서 갱신. */}
          {isLoggedIn ? (
            <ProfileMenu name={name ?? "사용자"} isAdmin={isAdmin} onLogout={onLogout} />
          ) : (
            <>
              <Link
                href="/login"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.07)] sm:px-3"
                style={{ color: "rgba(var(--ink-rgb), 0.8)" }}
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="cta-solid whitespace-nowrap rounded-full px-2.5 py-1.5 text-[13px] font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none sm:px-3"
              >
                회원가입
              </Link>
            </>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="전체 메뉴 열기"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 motion-reduce:transform-none lg:hidden"
            style={{ background: "rgba(var(--ink-rgb), 0.07)", color: "var(--heading)" }}
          >
            <Menu size={18} aria-hidden />
          </button>
        </div>
      </div>
      <MobileMenuSheet open={menuOpen} onClose={closeMenu} pathname={pathname} />
    </header>
  );
}
