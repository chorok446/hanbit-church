import Link from "next/link";
import { BookOpen, Clock, HeartHandshake, MapPin } from "lucide-react";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";

/**
 * 히어로 직하단 핵심 정보 스트립 — 스크롤 전에 보이는 4개 퀵카드
 * (이달의 말씀 · 예배 시간 · 오시는 길 · 새가족 안내).
 */
export function HomeQuickInfo() {
  const sundayService = WORSHIP_SERVICES[0];

  const items = [
    // 히어로가 이미 이달의 말씀을 크게 보여주므로 구절 반복 대신 '오늘의 묵상'으로 연결한다(라벨=목적지 일치).
    { href: "/devotion", icon: BookOpen, label: "오늘의 묵상", value: "말씀 한 구절, 묵상 한 편", sub: "오늘의 말씀 읽기" },
    { href: "/worship", icon: Clock, label: "예배 시간", value: sundayService.time, sub: "전체 예배 안내" },
    { href: "/about", icon: MapPin, label: "오시는 길", value: CHURCH.address, sub: "지도·주차 안내" },
    { href: "/welcome", icon: HeartHandshake, label: "새가족 안내", value: "처음 오셨나요?", sub: "환영 안내 보기" },
  ] as const;

  return (
    <section className="px-6 transition-colors" style={{ background: "var(--surface)" }}>
      <ul className="relative z-10 mx-auto -mt-10 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ href, icon: Icon, label, value, sub }) => (
          <li key={href} className="h-full">
            <Link
              href={href}
              className="card-lift flex h-full min-h-11 flex-col gap-2 rounded-2xl border p-5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p
                className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.16em]"
                style={{ color: "var(--accent-strong)" }}
              >
                <Icon size={13} aria-hidden style={{ color: "var(--accent)" }} />
                {label}
              </p>
              <p className="text-[15px] font-semibold leading-6" style={{ color: "var(--heading)" }}>
                {value}
              </p>
              <p className="mt-auto pt-1 text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
                {sub} →
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
