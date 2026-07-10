"use client";

import Link from "next/link";
import { ArrowRight, TrendingUp, Users } from "lucide-react";
import { FallbackImage } from "@/components/fallback-image";
import { statusMeta, type Event } from "@/data/events";
import { progressPercent } from "@/lib/progress";

const cardStyle = {
  background: "var(--card)",
  borderColor: "var(--border)",
};

/** 교제 페이지 옆의 "진행 중인 행사" 패널. 카드 전체가 행사 상세로 연결된다. */
export function FeedSideHot({ events }: { events: Event[] }) {
  return (
    <div className="rounded-2xl border p-5" style={cardStyle}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} style={{ color: "var(--accent)" }} aria-hidden />
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--foreground)" }}>
          진행 중인 행사
        </h3>
      </div>
      {events.length === 0 ? (
        <p className="py-4 text-center text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          진행 중인 행사가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {events.map((c) => {
            const pct = progressPercent(c.joined, c.capacity);
            return (
              <li key={c.id}>
                <Link
                  href={`/events/${c.id}`}
                  className="block rounded-xl border p-3 transition-colors hover:bg-[rgba(var(--ink-rgb),0.04)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-3">
                    <FallbackImage
                      src={c.thumb}
                      alt=""
                      decorative
                      thumbnail
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {c.title}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11.5px]" style={{ color: "var(--foreground-muted)" }}>
                        <Users size={11} aria-hidden />
                        모집 인원 {c.joined}/{c.capacity}명
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div
                      className="flex-1 h-1 rounded-full"
                      style={{ background: "rgba(var(--ink-rgb), 0.09)" }}
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${c.title} 모집 진행률`}
                    >
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: statusMeta[c.status].color }} />
                    </div>
                    <span className="text-[11px] opacity-60" style={{ color: "var(--foreground)" }}>{pct}%</span>
                  </div>
                  <span
                    className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium"
                    style={{ color: "var(--accent-strong)" }}
                  >
                    행사 보기 <ArrowRight size={12} aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
