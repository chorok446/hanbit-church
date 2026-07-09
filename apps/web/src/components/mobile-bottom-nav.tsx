"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutList, Flag, User } from "lucide-react";

const tabs = [
  { label: "홈", href: "/", icon: Home, match: (path: string) => path === "/" },
  { label: "교제", href: "/feed", icon: LayoutList, match: (path: string) => path.startsWith("/feed") || path.startsWith("/posts") },
  { label: "행사", href: "/campaigns", icon: Flag, match: (path: string) => path.startsWith("/campaigns") },
  { label: "마이", href: "/mypage", icon: User, match: (path: string) => path.startsWith("/mypage") || path.startsWith("/profile") },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl md:hidden"
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
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 transition-opacity"
              style={{ color: active ? "var(--accent)" : "var(--foreground-muted)" }}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} aria-hidden />
              <span className="truncate text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
