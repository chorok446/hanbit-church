"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { Campaign } from "@/data/campaigns";
import { fetchPublicPraiseSchedules } from "@/data/praise-team";
import {
  eventTypeLabel,
  eventTypeStyle,
  formatDateLabel,
  getEventsForWeek,
  mapPraiseScheduleToCalendarEvents,
  toDateKey,
  type CalendarEvent,
} from "@/data/calendar";

const MAX_ITEMS = 5;

type WeeklyItem = { dateKey: string; event: CalendarEvent };

/**
 * 홈 "이번 주 교회 일정" 요약 — 예배 반복 일정 + 행사 중 앞선 3~5건.
 * 전체 캘린더는 /campaigns?view=calendar. 일정이 없으면 섹션 자체를 숨긴다.
 */
export function HomeWeeklySchedule() {
  const [items, setItems] = useState<WeeklyItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Campaign[]>("/api/campaigns").catch(() => [] as Campaign[]), // 행사를 못 불러와도 예배 일정은 보여준다.
      // 찬양팀 일정 — 서버가 요청자별 범위(비로그인 PUBLIC / 로그인 CHURCH+PUBLIC / 멤버 전체)로 좁혀 준다.
      fetchPublicPraiseSchedules().catch(() => []),
    ])
      .then(([campaigns, praiseSchedules]) => {
        if (cancelled) return;
        const week = getEventsForWeek(campaigns, new Date(), mapPraiseScheduleToCalendarEvents(praiseSchedules));
        setItems(
          week
            .flatMap(({ dateKey, events }) =>
              events
                // 홈 요약은 교회 일정만 — 공휴일은 캘린더 보기에서만 노출한다.
                .filter((event) => event.type !== "holiday")
                .map((event) => ({ dateKey, event })),
            )
            .slice(0, MAX_ITEMS),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 로딩 중이거나 이번 주 일정이 없으면 섹션 숨김(레이아웃 점프 최소화).
  if (!items || items.length === 0) return null;

  const todayKey = toDateKey(new Date());

  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          This Week
        </p>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="text-[26px] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            이번 주 교회 일정
          </h2>
          <Link
            href="/campaigns?view=calendar"
            className="flex min-h-11 items-center text-[13px] underline underline-offset-4"
            style={{ color: "var(--foreground-muted)" }}
          >
            전체 일정 보기
          </Link>
        </div>

        <ul className="overflow-hidden rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          {items.map(({ dateKey, event }, index) => {
            const badge = eventTypeStyle(event.type);
            const row = (
              <div className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                <span
                  className="w-28 shrink-0 text-[12px] font-semibold"
                  style={{ color: dateKey === todayKey ? "var(--accent-strong)" : "var(--foreground-muted)" }}
                >
                  {formatDateLabel(dateKey)}
                  {dateKey === todayKey ? " · 오늘" : ""}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="min-w-0 truncate text-[15px] font-medium" style={{ color: "var(--heading)" }}>
                    {event.title}
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={badge}>
                    {eventTypeLabel(event.type)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  {event.startTime ? (
                    <span className="flex items-center gap-1">
                      <Clock size={12} aria-hidden style={{ color: "var(--accent)" }} />
                      {event.startTime}
                    </span>
                  ) : null}
                  {event.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} aria-hidden style={{ color: "var(--accent)" }} />
                      {event.location}
                    </span>
                  ) : null}
                </span>
              </div>
            );
            return (
              // 여러 날 이어지는 행사는 같은 event.id 가 날짜별로 반복될 수 있어 dateKey 를 붙인다.
              <li key={`${dateKey}-${event.id}`} style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
                {event.href ? (
                  <Link href={event.href} className="block transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)]">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
