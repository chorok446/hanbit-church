import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { WORSHIP_SERVICES } from "@/data/church";

/** 홈 예배 시간 요약 — 상세는 /worship. */
export function WorshipSummary() {
  return (
    <section className="px-6 py-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          Worship
        </p>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="text-[26px] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            예배로 초대합니다
          </h2>
          <Link href="/worship" className="text-[13px] underline underline-offset-4" style={{ color: "var(--foreground-muted)" }}>
            예배 안내 전체 보기
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORSHIP_SERVICES.map((service) => (
            <li
              key={service.name}
              className="rounded-2xl border p-6"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <p className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
                {service.name}
              </p>
              <p className="mt-3 flex items-center gap-2 text-[14px]" style={{ color: "var(--foreground)" }}>
                <Clock size={14} aria-hidden style={{ color: "var(--accent)" }} />
                {service.time}
              </p>
              <p className="mt-1.5 flex items-center gap-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                <MapPin size={14} aria-hidden style={{ color: "var(--accent)" }} />
                {service.place}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
