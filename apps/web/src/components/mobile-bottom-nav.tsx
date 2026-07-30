"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutList, Flag, User, Clock, MapPin, HeartHandshake } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";

/** 교인(로그인) 탭 — 일상 도구 중심. */
const memberTabs = [
  { label: "홈", href: "/", icon: Home, match: (path: string) => path === "/" },
  { label: "교제", href: "/feed", icon: LayoutList, match: (path: string) => path.startsWith("/feed") || path.startsWith("/posts") },
  { label: "행사", href: "/events", icon: Flag, match: (path: string) => path.startsWith("/events") },
  { label: "마이", href: "/mypage", icon: User, match: (path: string) => path.startsWith("/mypage") || path.startsWith("/profile") },
];

/** 방문자(비로그인) 탭 — 1순위 사용자의 과업(예배 확인·방문·새가족) 중심.
 *  서버 스냅샷은 항상 비로그인이라 방문자 탭으로 hydration 후 교인 탭으로 갱신된다(헤더와 동일 패턴). */
const visitorTabs = [
  { label: "홈", href: "/", icon: Home, match: (path: string) => path === "/" },
  { label: "예배안내", href: "/worship", icon: Clock, match: (path: string) => path.startsWith("/worship") },
  { label: "오시는길", href: "/about#location", icon: MapPin, match: (path: string) => path.startsWith("/about") },
  { label: "새가족", href: "/welcome", icon: HeartHandshake, match: (path: string) => path.startsWith("/welcome") },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuthSession();
  const tabs = isLoggedIn ? memberTabs : visitorTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl lg:hidden"
      style={{
        background: "color-mix(in srgb, var(--surface) 93%, transparent)",
        borderColor: "var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="주요 메뉴"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-2">
        {tabs.map(({ label, href, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-opacity"
              style={{ color: active ? "var(--accent)" : "var(--foreground-muted)" }}
              aria-current={active ? "page" : undefined}
            >
              {/* 데스크톱 헤더 navdot 과 같은 활성 표식 — 활성 탭에 즉시 페이드 등장(.indicator-fade). */}
              {active ? (
                <span
                  className="indicator-fade absolute top-0.5 inset-x-0 mx-auto h-1 w-1 rounded-full"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />
              ) : null}
              <Icon size={20} aria-hidden />
              <span className="truncate text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
