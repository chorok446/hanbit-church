import type { Metadata } from "next";
import Link from "next/link";
import { CalendarHeart, ChevronRight, Clock, HeartHandshake } from "lucide-react";
import { NewsPostList } from "./news-post-list";
import { StaffWriteButton } from "@/components/staff-write-button";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";

export const metadata: Metadata = {
  title: "소식",
  description: `${CHURCH.name} 공지사항과 주보`,
};

// 목록이 비어 있어도 첫 화면이 허전하지 않도록 소식 위에 두는 핵심 안내 3종.
const QUICK_LINKS = [
  { href: "/worship", icon: Clock, title: "이번 주 예배", body: WORSHIP_SERVICES[0].time },
  { href: "/welcome", icon: HeartHandshake, title: "새가족 안내", body: "처음 오신 분을 환영합니다" },
  { href: "/campaigns", icon: CalendarHeart, title: "행사·사역", body: "진행 중인 행사 바로가기" },
] as const;

export default function NewsPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          News
        </p>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h1
            className="text-[32px] sm:text-[38px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            교회 소식
          </h1>
          {/* 스태프(콘텐츠 관리 권한)에게만 보이는 전용 작성 진입점 */}
          <StaffWriteButton href="/news/write" label="소식 작성" />
        </div>

        <ul className="mb-10 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:grid-cols-3">
          {QUICK_LINKS.map(({ href, icon: Icon, title, body }) => (
            <li key={href} className="min-[480px]:first:col-span-2 sm:first:col-span-1">
              <Link
                href={href}
                className="flex h-full min-h-[76px] items-center gap-3.5 rounded-2xl border p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.35)] motion-reduce:transform-none"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--accent-soft)" }}
                  aria-hidden
                >
                  <Icon size={15} style={{ color: "var(--accent-strong)" }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold" style={{ color: "var(--heading)" }}>
                    {title}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
                    {body}
                  </span>
                </span>
                <ChevronRight size={15} aria-hidden className="shrink-0" style={{ color: "var(--foreground-muted)" }} />
              </Link>
            </li>
          ))}
        </ul>

        <NewsPostList />
      </div>
    </section>
  );
}
