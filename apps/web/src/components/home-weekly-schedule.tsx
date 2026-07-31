"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { fetchUpcomingEvents, type Event } from "@/data/events";
import { fetchPublicPraiseSchedules, type PraiseSchedule } from "@/data/praise-team";
import {
  eventTypeLabel,
  eventTypeStyle,
  fetchManualCalendarEvents,
  formatDateLabel,
  getEventsForWeek,
  mapPraiseScheduleToCalendarEvents,
  toDateKey,
  type CalendarEvent,
} from "@/data/calendar";

const MAX_ITEMS = 5;

type WeeklyItem = { dateKey: string; event: CalendarEvent };

const buildItems = (events: Event[], extra: CalendarEvent[]): WeeklyItem[] =>
  getEventsForWeek(events, new Date(), extra)
    .flatMap(({ dateKey, events }) =>
      events
        // 홈 요약은 교회 일정만 — 공휴일은 캘린더 보기에서만 노출한다.
        .filter((event) => event.type !== "holiday")
        .map((event) => ({ dateKey, event })),
    )
    .slice(0, MAX_ITEMS);

/**
 * 홈 "이번 주 교회 일정" 요약 — 예배 반복 일정 + 행사 중 앞선 3~5건.
 * 전체 캘린더는 /events?view=calendar. 일정이 없으면 섹션 자체를 숨긴다.
 *
 * 세 소스(행사·수동·찬양팀 공개분) 모두 서버가 ISR(60s)로 선주입한다 — 시드가 있으면 첫 페인트(SSR)에
 * 바로 그려 섹션 pop-in(아래 콘텐츠 밀림)이 없고, 늦은 병합이 없어 보이는 행이 교체되지도 않는다.
 * 찬양팀은 쿠키 없는 ISR fetch 라 PUBLIC 스코프만 실린다(교인 스코프는 찬양팀 페이지에서).
 * 시드가 하나라도 없으면(빌드 시 API 미가용) 클라이언트에서 병렬 조회해 한 번만 그린다.
 */
export function HomeWeeklySchedule({
  initialEvents = null,
  initialManual = null,
  initialPraise = null,
}: {
  initialEvents?: Event[] | null;
  initialManual?: CalendarEvent[] | null;
  initialPraise?: PraiseSchedule[] | null;
} = {}) {
  const seeded = initialEvents !== null && initialManual !== null && initialPraise !== null;
  const [items, setItems] = useState<WeeklyItem[] | null>(() =>
    seeded ? buildItems(initialEvents, [...mapPraiseScheduleToCalendarEvents(initialPraise), ...initialManual]) : null,
  );

  useEffect(() => {
    if (seeded) return;
    let cancelled = false;
    const eventsP =
      initialEvents !== null ? Promise.resolve(initialEvents) : fetchUpcomingEvents().catch(() => [] as Event[]);
    const manualP =
      initialManual !== null ? Promise.resolve(initialManual) : fetchManualCalendarEvents().catch(() => [] as CalendarEvent[]);
    const praiseP =
      initialPraise !== null ? Promise.resolve(initialPraise) : fetchPublicPraiseSchedules().catch(() => [] as PraiseSchedule[]);
    Promise.all([eventsP, manualP, praiseP]).then(([events, manualEvents, praiseSchedules]) => {
      if (cancelled) return;
      setItems(buildItems(events, [...mapPraiseScheduleToCalendarEvents(praiseSchedules), ...manualEvents]));
    });
    return () => {
      cancelled = true;
    };
  }, [seeded, initialEvents, initialManual, initialPraise]);

  // 로딩 중이거나 이번 주 일정이 없으면 섹션 숨김(레이아웃 점프 최소화).
  if (!items || items.length === 0) return null;

  const todayKey = toDateKey(new Date());

  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <span aria-hidden className="mb-4 block h-px w-12" style={{ background: "var(--accent)" }} />
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="text-[26px] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            이번 주 교회 일정
          </h2>
          <Link
            href="/events?view=calendar"
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
