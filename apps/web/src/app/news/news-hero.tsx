import Link from "next/link";
import { CalendarHeart, ChevronRight, Clock, HeartHandshake } from "lucide-react";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";

// 목록이 비어 있어도 첫 화면이 허전하지 않도록 소식 위에 두는 핵심 안내 3종.
const QUICK_LINKS = [
  { href: "/worship", icon: Clock, label: "예배", title: "이번 주 예배", body: WORSHIP_SERVICES[0].time },
  { href: "/welcome", icon: HeartHandshake, label: "새가족", title: "새가족 안내", body: "처음 오신 분을 환영합니다" },
  { href: "/events", icon: CalendarHeart, label: "행사·사역", title: "행사·사역", body: "진행 중인 행사 바로가기" },
] as const;

/**
 * 소식(/news) 히어로 밴드 — 네이비(surface-dark) + 골드 글로우. (about/worship 밴드 톤)
 * 하단에 핵심 안내 3열 바를 -32px 겹쳐 얹는다. 크림 텍스트는 배너 관례(var(--on-banner)).
 */
export function NewsHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-40 pb-16" style={{ background: "var(--surface-dark)" }}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/4 h-[420px] w-[420px] rounded-full opacity-20 blur-[150px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto max-w-[840px]">
        <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent)" }}>
          News
        </p>
        <h1
          className="text-[34px] sm:text-[40px] text-[var(--on-banner)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          교회 소식
        </h1>
        <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[30px]" style={{ color: "rgba(var(--on-banner-rgb), 0.78)" }}>
          {CHURCH.name}의 공지사항과 주보를 한곳에서 확인하세요.
        </p>
      </div>
    </section>
  );
}

/** 히어로와 본문 사이에 -32px 겹치는 핵심 안내 3열 카드 바. */
export function NewsQuickLinks() {
  return (
    <div className="relative z-10 -mt-8 px-6">
      <ul className="mx-auto grid max-w-[840px] grid-cols-1 gap-px overflow-hidden rounded-2xl border shadow-[0_24px_48px_-32px_rgba(0,0,0,0.45)] min-[560px]:grid-cols-3"
        style={{ background: "var(--border)", borderColor: "var(--border)" }}
      >
        {QUICK_LINKS.map(({ href, icon: Icon, label, title, body }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex h-full items-center gap-3.5 p-4 transition-colors sm:p-5"
              style={{ background: "var(--card)" }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--accent-soft)" }}
                aria-hidden
              >
                <Icon size={16} style={{ color: "var(--accent-strong)" }} />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "var(--accent-strong)" }}
                >
                  {label}
                </span>
                <span className="mt-0.5 block truncate text-[14px] font-semibold" style={{ color: "var(--heading)" }}>
                  {title}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
                  {body}
                </span>
              </span>
              <ChevronRight
                size={16}
                aria-hidden
                className="shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                style={{ color: "var(--foreground-muted)" }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
