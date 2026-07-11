"use client";

// 행사·사역 "캘린더 보기" — 월간 그리드 + 이번 주 일정 패널.
// 데이터: 예배 반복 일정(church.ts) + 행사 전체 목록(GET /api/events, 공개 API).
// 카드 보기의 검색어·모집 상태·날짜 범위 필터(urlState)를 내려받아 행사만 클라이언트에서 거른다
// — 예배·수동 일정·공휴일은 필터와 무관하게 항상 표시한다.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { apiGet } from "@/lib/api";
import { getClientApiBaseUrl } from "@/lib/api-url";
import type { Event } from "@/data/events";
import type { EventListUrlState } from "@/lib/use-url-query";
import { fetchPublicPraiseSchedules, type PraiseSchedule } from "@/data/praise-team";
import {
  eventTypeDotColor,
  eventTypeLabel,
  eventTypeStyle,
  fetchManualCalendarEvents,
  formatDateLabel,
  getEventsForMonth,
  getEventsForWeek,
  mapPraiseScheduleToCalendarEvents,
  toDateKey,
  type CalendarEvent,
  type CalendarEventType,
} from "@/data/calendar";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MAX_CELL_EVENTS = 2;
const MAX_CELL_DOTS = 3;

/** 일정 타입 필터 칩. 새가족·봉사는 데이터 소스가 아직 없어 노출하지 않는다. */
type CalendarTypeFilter = "all" | "worship" | "event" | "deadline";

const TYPE_FILTERS: { value: CalendarTypeFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "worship", label: "예배" },
  { value: "event", label: "행사" },
  { value: "deadline", label: "신청 마감" },
];

function matchesFilter(type: CalendarEventType, filter: CalendarTypeFilter): boolean {
  if (type === "holiday") return true; // 공휴일은 필터 칩과 무관하게 항상 표시(칩에도 없음)
  if (filter === "all") return true;
  if (filter === "worship") return type === "worship" || type === "prayer";
  return type === filter;
}

function eventAriaLabel(dateKey: string, event: CalendarEvent): string {
  const time = event.startTime ? ` ${event.startTime}` : "";
  return `${formatDateLabel(dateKey)}${time} ${event.title}, ${eventTypeLabel(event.type)}`;
}

/** 이번 주 패널·선택 날짜 리스트 공용 일정 행. */
function EventRow({ dateKey, event }: { dateKey: string; event: CalendarEvent }) {
  const style = eventTypeStyle(event.type);
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-[14px] font-medium" style={{ color: "var(--heading)" }}>
          {event.title}
        </span>
        <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={style}>
          {eventTypeLabel(event.type)}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
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
        {event.status ? <span>{event.status}</span> : null}
      </div>
    </>
  );

  if (!event.href) {
    return <div className="rounded-xl px-3 py-2.5">{body}</div>;
  }
  return (
    <Link
      href={event.href}
      aria-label={eventAriaLabel(dateKey, event)}
      className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)]"
    >
      {body}
    </Link>
  );
}

type FetchState =
  | { status: "loading"; events: Event[] }
  | { status: "success"; events: Event[] }
  | { status: "error"; events: Event[] };

export function EventCalendarView({ urlState }: { urlState?: EventListUrlState } = {}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>("all");
  // 새벽 기도회(매일 반복)는 월간 그리드에선 기본 숨김 — 칸 포화 방지. 이번 주 패널에는 항상 포함.
  const [showDaily, setShowDaily] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>({ status: "loading", events: [] });
  const [retryTick, setRetryTick] = useState(0);

  // 찬양팀 일정 — 서버가 요청자별로 범위를 좁혀 준다(비로그인 PUBLIC / 로그인 CHURCH+PUBLIC /
  // 찬양팀 멤버 전체). 실패해도 캘린더 본체는 그려지도록 빈 배열 fallback.
  const [praiseSchedules, setPraiseSchedules] = useState<PraiseSchedule[]>([]);
  // 관리자 수동 등록 일정(절기·심방 등) — 실패해도 빈 배열 fallback.
  const [manualEvents, setManualEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGet<Event[]>("/api/events")
      .then((events) => {
        if (!cancelled) setFetchState({ status: "success", events });
      })
      .catch(() => {
        if (!cancelled) setFetchState({ status: "error", events: [] });
      });
    fetchPublicPraiseSchedules()
      .then((schedules) => {
        if (!cancelled) setPraiseSchedules(schedules);
      })
      .catch(() => {
        if (!cancelled) setPraiseSchedules([]);
      });
    fetchManualCalendarEvents()
      .then((items) => {
        if (!cancelled) setManualEvents(items);
      })
      .catch(() => {
        if (!cancelled) setManualEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  // 카드 보기 필터를 행사에만 적용 — 문자열 비교는 ISO(yyyy-MM-dd) 날짜라 안전하다.
  const events = useMemo(() => {
    const all = fetchState.events;
    if (!urlState) return all;
    const keyword = urlState.query.trim().toLowerCase();
    return all.filter((event) => {
      if (keyword && !event.title.toLowerCase().includes(keyword) && !event.summary.toLowerCase().includes(keyword)) return false;
      if (urlState.filter !== "all" && event.status !== urlState.filter) return false;
      if (urlState.recruitState && event.recruitState !== urlState.recruitState) return false;
      if (urlState.availableOnly && !event.recruitable) return false;
      if (urlState.recruitEndFrom && event.recruitEnd < urlState.recruitEndFrom) return false;
      if (urlState.recruitEndTo && event.recruitEnd > urlState.recruitEndTo) return false;
      if (urlState.runStartFrom && event.runStart < urlState.runStartFrom) return false;
      if (urlState.runStartTo && event.runStart > urlState.runStartTo) return false;
      return true;
    });
  }, [fetchState.events, urlState]);
  const eventFilterActive = urlState
    ? Boolean(
        urlState.query.trim() || urlState.filter !== "all" || urlState.recruitState || urlState.availableOnly ||
        urlState.recruitEndFrom || urlState.recruitEndTo || urlState.runStartFrom || urlState.runStartTo,
      )
    : false;
  const praiseEvents = useMemo(() => mapPraiseScheduleToCalendarEvents(praiseSchedules), [praiseSchedules]);
  const extraEvents = useMemo(() => [...praiseEvents, ...manualEvents], [praiseEvents, manualEvents]);

  const monthEvents = useMemo(() => {
    const byDate = getEventsForMonth(events, cursor.year, cursor.month, {
      includeDaily: showDaily,
      extraEvents,
    });
    if (typeFilter === "all") return byDate;
    const filtered = new Map<string, CalendarEvent[]>();
    for (const [key, events] of byDate) {
      const kept = events.filter((event) => matchesFilter(event.type, typeFilter));
      if (kept.length > 0) filtered.set(key, kept);
    }
    return filtered;
  }, [events, cursor.year, cursor.month, showDaily, typeFilter, extraEvents]);

  const weekDays = useMemo(() => {
    const days = getEventsForWeek(events, today, extraEvents);
    if (typeFilter === "all") return days;
    return days
      .map(({ dateKey, events }) => ({ dateKey, events: events.filter((event) => matchesFilter(event.type, typeFilter)) }))
      .filter(({ events }) => events.length > 0);
  }, [events, today, typeFilter, extraEvents]);

  const monthHasEvents = monthEvents.size > 0;
  const selectedEvents = selectedDate ? monthEvents.get(selectedDate) ?? [] : [];

  // 월 그리드 셀: 앞쪽 빈 칸(일요일 시작) + 해당 월 날짜.
  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();

  const moveMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedDate(null);
  };
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDate(todayKey);
  };

  const navButtonStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" } as const;
  const selectStyle = {
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    color: "var(--heading)",
    background: "var(--card)",
    borderColor: "var(--border)",
  } as const;
  const selectClassName =
    "rounded-full border px-4 py-2 text-[15px] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  // 연도 옵션: 현재 연도 ±3. [이전]/[다음]으로 범위를 벗어나도 select 값이 비지 않게 cursor.year 를 포함시킨다.
  const yearFrom = Math.min(today.getFullYear() - 3, cursor.year);
  const yearTo = Math.max(today.getFullYear() + 3, cursor.year);
  const yearOptions = Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i);

  return (
    <div>
      {/* 일정 타입 필터 칩 + 새벽 기도회 토글 */}
      <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="일정 타입 필터">
        {TYPE_FILTERS.map(({ value, label }) => {
          const active = typeFilter === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setTypeFilter(value)}
              className="rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors"
              style={
                active
                  ? { background: "var(--cta-bg)", color: "var(--cta-fg)" }
                  : { background: "var(--chip-bg)", color: "var(--foreground-muted)" }
              }
            >
              {label}
            </button>
          );
        })}
        <span aria-hidden className="mx-1 h-4 w-px" style={{ background: "var(--border)" }} />
        <button
          type="button"
          aria-pressed={showDaily}
          onClick={() => setShowDaily((prev) => !prev)}
          className="rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors"
          style={
            showDaily
              ? { background: "rgba(var(--ink-rgb), 0.08)", borderColor: "var(--border)", color: "var(--heading)" }
              : { background: "transparent", borderColor: "var(--border)", color: "var(--foreground-muted)" }
          }
        >
          새벽 기도회 표시
        </button>
        {/* iCal 구독 — 구글/애플 캘린더에서 이 URL 을 구독하면 교회 일정이 자동 동기화된다. */}
        <a
          href={`${getClientApiBaseUrl()}/api/calendar/ics`}
          className="ml-auto rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors"
          style={{ background: "transparent", borderColor: "var(--border)", color: "var(--foreground-muted)" }}
        >
          캘린더 구독(.ics)
        </a>
      </div>

      {eventFilterActive ? (
        <p className="mb-4 text-[12.5px]" style={{ color: "var(--foreground-muted)" }} aria-live="polite">
          카드 보기의 검색·필터가 적용된 행사 {events.length}건을 표시하고 있습니다. 예배·교회 일정은 필터와 무관하게 항상 보입니다.
        </p>
      ) : null}

      {fetchState.status === "error" ? (
        <div
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-[13px]"
          style={{ background: "var(--danger-soft)", borderColor: "var(--border)", color: "var(--foreground)" }}
        >
          <span>행사 일정을 불러오지 못했습니다. 예배 일정만 표시됩니다.</span>
          <button
            type="button"
            onClick={() => {
              // 재시도 동안 이전 데이터(예배 일정)는 유지한 채 로딩 상태만 표시한다.
              setFetchState((prev) => ({ status: "loading", events: prev.events }));
              setRetryTick((tick) => tick + 1);
            }}
            className="cta-solid rounded-full px-4 py-1.5 text-[12px] font-medium"
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {/* 모바일: 이번 주 일정 먼저 → 캘린더. lg: 캘린더 좌 + 이번 주 우. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ── 월간 캘린더 ── */}
        <section aria-label="월간 일정 캘린더" className="order-2 min-w-0 lg:order-1">
          {/* 헤더: 연·월 셀렉트(빠른 이동) + [이전][오늘][다음]. 모바일에선 flex-wrap 으로 자연 줄바꿈. */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2" aria-live="polite">
              <label className="flex min-h-10 items-center">
                <span className="sr-only">연도 선택</span>
                <select
                  value={cursor.year}
                  onChange={(event) => {
                    setCursor((prev) => ({ year: Number(event.target.value), month: prev.month }));
                    setSelectedDate(null);
                  }}
                  className={selectClassName}
                  style={selectStyle}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}년
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-10 items-center">
                <span className="sr-only">월 선택</span>
                <select
                  value={cursor.month}
                  onChange={(event) => {
                    setCursor((prev) => ({ year: prev.year, month: Number(event.target.value) }));
                    setSelectedDate(null);
                  }}
                  className={selectClassName}
                  style={selectStyle}
                >
                  {Array.from({ length: 12 }, (_, month) => (
                    <option key={month} value={month}>
                      {month + 1}월
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => moveMonth(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={navButtonStyle}
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="rounded-full px-3.5 py-1.5 text-[12px] font-medium"
                style={navButtonStyle}
              >
                오늘
              </button>
              <button
                type="button"
                aria-label="다음 달"
                onClick={() => moveMonth(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={navButtonStyle}
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
              {WEEKDAY_HEADERS.map((label) => (
                <div
                  key={label}
                  className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--foreground-muted)" }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <div key={`blank-${i}`} aria-hidden className="min-h-14 sm:min-h-24" style={{ background: "rgba(var(--ink-rgb), 0.02)" }} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNumber = i + 1;
                const dateKey = toDateKey(new Date(cursor.year, cursor.month, dayNumber));
                const events = monthEvents.get(dateKey) ?? [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                // 일요일과 공휴일 날짜 숫자는 붉은 톤(한국 달력 관례). 공휴일은 필터와 무관하게 항상 이벤트에 포함된다.
                const isRedDay = (leadingBlanks + i) % 7 === 0 || events.some((event) => event.type === "holiday");
                return (
                  <div
                    key={dateKey}
                    className="relative min-h-14 border-t p-1 sm:min-h-24 sm:p-1.5"
                    style={{
                      borderColor: "var(--border)",
                      background: isSelected ? "rgba(var(--ink-rgb), 0.05)" : undefined,
                    }}
                  >
                    {/* 모바일: 셀 전체가 탭 대상 → 아래 "선택한 날짜 일정" 리스트 갱신. (링크는 sm 이상에서만 렌더돼 중첩 없음) */}
                    <button
                      type="button"
                      className="absolute inset-0 z-10 sm:hidden"
                      aria-label={`${formatDateLabel(dateKey)} 일정 ${events.length}개 보기`}
                      onClick={() => setSelectedDate(dateKey)}
                    />
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[12px]"
                      style={{
                        color: isRedDay ? "var(--danger)" : isToday ? "var(--heading)" : "var(--foreground-muted)",
                        ...(isToday ? { boxShadow: "0 0 0 1.5px var(--accent)", fontWeight: 700 } : undefined),
                      }}
                    >
                      {dayNumber}
                    </span>
                    {/* sm 이상: 일정 텍스트 칩(링크) 최대 2개 + "+N" */}
                    <div className="mt-1 hidden flex-col gap-1 sm:flex">
                      {events.slice(0, MAX_CELL_EVENTS).map((event) =>
                        event.href ? (
                          <Link
                            key={event.id}
                            href={event.href}
                            aria-label={eventAriaLabel(dateKey, event)}
                            className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium hover:opacity-80"
                            style={eventTypeStyle(event.type)}
                          >
                            {event.title}
                          </Link>
                        ) : (
                          <span key={event.id} className="truncate rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={eventTypeStyle(event.type)}>
                            {event.title}
                          </span>
                        ),
                      )}
                      {events.length > MAX_CELL_EVENTS ? (
                        <span className="px-1.5 text-[11px]" style={{ color: "var(--foreground-muted)" }}>
                          +{events.length - MAX_CELL_EVENTS}
                        </span>
                      ) : null}
                    </div>
                    {/* 모바일: 타입 컬러 점만 */}
                    <div aria-hidden className="pointer-events-none mt-1 flex justify-center gap-0.5 sm:hidden">
                      {events.slice(0, MAX_CELL_DOTS).map((event) => (
                        <span key={event.id} className="h-1.5 w-1.5 rounded-full" style={{ background: eventTypeDotColor(event.type) }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {fetchState.status === "loading" ? (
            <p className="mt-3 text-[12px]" style={{ color: "var(--foreground-muted)" }} aria-live="polite">
              행사 일정을 불러오는 중입니다…
            </p>
          ) : !monthHasEvents ? (
            <p className="mt-3 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              이번 달 등록된 일정이 없습니다.
            </p>
          ) : null}

          {/* 모바일: 선택한 날짜 일정 리스트 */}
          {selectedDate ? (
            <div className="mt-4 rounded-2xl border p-3 sm:hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p className="px-3 pb-1 pt-1 text-[13px] font-semibold" style={{ color: "var(--heading)" }}>
                {formatDateLabel(selectedDate)} 일정
              </p>
              {selectedEvents.length === 0 ? (
                <p className="px-3 pb-2 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                  선택한 날짜에 일정이 없습니다.
                </p>
              ) : (
                <ul>
                  {selectedEvents.map((event) => (
                    <li key={event.id}>
                      <EventRow dateKey={selectedDate} event={event} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        {/* ── 이번 주 일정 (모바일에선 캘린더보다 먼저) ── */}
        <section aria-label="이번 주 일정" className="order-1 lg:order-2">
          <div className="rounded-2xl border p-5" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
              This Week
            </p>
            <h3 className="mb-4 text-[18px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}>
              이번 주 일정
            </h3>
            {weekDays.length === 0 ? (
              <p className="py-4 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
                이번 주 등록된 일정이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {weekDays.map(({ dateKey, events }) => (
                  <div key={dateKey}>
                    <p
                      className="mb-1 flex items-center gap-2 text-[12px] font-semibold"
                      style={{ color: dateKey === todayKey ? "var(--accent-strong)" : "var(--foreground-muted)" }}
                    >
                      {formatDateLabel(dateKey)}
                      {dateKey === todayKey ? <span>오늘</span> : null}
                    </p>
                    <ul className="rounded-xl" style={{ background: "rgba(var(--ink-rgb), 0.02)" }}>
                      {events.map((event) => (
                        <li key={event.id}>
                          <EventRow dateKey={dateKey} event={event} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
