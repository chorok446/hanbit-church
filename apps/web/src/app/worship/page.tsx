import type { Metadata } from "next";
import { Clock, MapPin } from "lucide-react";
import { CHURCH, WORSHIP_SERVICES } from "@/data/church";

export const metadata: Metadata = {
  title: "예배안내",
  description: `${CHURCH.name} 예배 시간과 장소 안내`,
};

export default function WorshipPage() {
  return (
    <section
      className="min-h-screen px-6 pb-24 pt-32 transition-colors"
      style={{ backgroundImage: "var(--page-gradient)" }}
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Worship
        </p>
        <h1
          className="text-[32px] sm:text-[38px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
        >
          예배안내
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-8" style={{ color: "var(--foreground-muted)" }}>
          모든 예배는 누구에게나 열려 있습니다. 처음 오시는 분은 예배 후 안내 데스크에서 새가족
          안내를 받으실 수 있습니다.
        </p>

        <ul className="mt-10 space-y-4">
          {WORSHIP_SERVICES.map((service) => (
            <li
              key={service.name}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-7 py-6"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <h2
                className="text-[19px]"
                style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
              >
                {service.name}
              </h2>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[14.5px]" style={{ color: "var(--foreground)" }}>
                <span className="flex items-center gap-2">
                  <Clock size={15} aria-hidden style={{ color: "var(--accent)" }} />
                  {service.time}
                </span>
                <span className="flex items-center gap-2" style={{ color: "var(--foreground-muted)" }}>
                  <MapPin size={15} aria-hidden style={{ color: "var(--accent)" }} />
                  {service.place}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {/* TODO(Phase 2): 유튜브 라이브·설교 다시보기, 헌금 계좌 안내 */}
        <div
          className="mt-10 rounded-2xl border border-dashed px-7 py-6 text-[13.5px]"
          style={{ borderColor: "var(--border)", color: "var(--foreground-muted)", background: "var(--glass)" }}
        >
          온라인 예배(유튜브 라이브)와 헌금 안내는 준비 중입니다.
        </div>
      </div>
    </section>
  );
}
