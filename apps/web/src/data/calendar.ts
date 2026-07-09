// 교회 일정 캘린더 데이터 계층.
// 소스는 두 곳: 예배 시간표(church.ts WORSHIP_SERVICES 반복 일정)와 행사·사역(백엔드 Campaign).
// D-day·상태 라벨은 campaignLifecycle() 단일 기준을 재사용한다(카드·상세·캘린더 동일 기준).
import { campaignLifecycle, isIsoDate, type Campaign } from "@/data/campaigns";
import { WORSHIP_SERVICES, type WorshipService } from "@/data/church";

export type CalendarEventType =
  | "worship" // 예배
  | "event" // 행사·사역
  | "new-family" // 새가족 (데이터 소스 미도입 — 수동 일정용 예약)
  | "service" // 봉사 (데이터 소스 미도입 — 수동 일정용 예약)
  | "prayer" // 기도회 (새벽 기도회 등 매일 반복)
  | "praise" // 찬양팀 일정 (백엔드 praise_schedules — visibility 로 노출 범위 제어)
  | "deadline" // 행사 신청 마감
  | "holiday" // 대한민국 공휴일 (정적 테이블 — 클릭 불가)
  | "etc";

export type CalendarEventSource = "worship" | "campaign" | "manual" | "holiday";

export type CalendarEvent = {
  id: string;
  title: string;
  type: CalendarEventType;
  /** yyyy-MM-dd */
  startDate: string;
  /** yyyy-MM-dd — 여러 날 이어지는 일정(행사 진행 기간)만 가진다. */
  endDate?: string;
  /** 표시용 시각 문자열 (예: "오전 11:00"). 종일 일정이면 없음. */
  startTime?: string;
  location?: string;
  source: CalendarEventSource;
  /** source 가 campaign 이면 campaign id. */
  sourceId?: string;
  /** 클릭 시 이동 경로 (행사 → /campaigns/{id}, 예배 → /worship). */
  href?: string;
  isRecurring?: boolean;
  /** 상태·D-day 라벨. 행사 계열은 campaignLifecycle().dday 를 그대로 쓴다. */
  status?: string;
};

// TODO(관리자 일정: 백엔드 모델·CRUD 필요)
// 관리자가 직접 등록하는 수동 일정(절기 행사·심방·새가족 환영회 등)을 위한 타입.
// 아직 백엔드 엔티티·API 가 없어 프론트 타입만 예약해 둔다.
// 도입 시: /api/admin/calendar CRUD + 공개 GET /api/calendar 를 추가하고,
// fetchManualCalendarEvents() 결과를 collectCalendarEvents() 에 합류시키면 된다.
export type ManualCalendarEvent = Omit<CalendarEvent, "source" | "sourceId" | "isRecurring"> & {
  source: "manual";
  /** 작성 관리자 표시명 (감사 로그용). */
  createdBy?: string;
};

// ─── 날짜 유틸 (교회 일정은 브라우저 로컬 기준 — 외부 라이브러리 없이 Date 계산) ───

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** yyyy-MM-dd → 로컬 자정 Date. 형식이 틀리면 null. */
export function parseDateKey(key: string): Date | null {
  if (!isIsoDate(key)) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

/** "7월 12일 (토)" 형태의 표시 라벨. */
export function formatDateLabel(key: string): string {
  const date = parseDateKey(key);
  if (!date) return key;
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}

// ─── 예배 시간 문자열 파싱 ("주일 오전 11:00" → 일요일 반복 + "오전 11:00") ───

export type WorshipRecurrence =
  | { kind: "weekly"; weekday: number } // 0=일요일
  | { kind: "daily" };

const WEEKDAY_TOKENS: Record<string, number> = {
  주일: 0,
  일요일: 0,
  월요일: 1,
  화요일: 2,
  수요일: 3,
  목요일: 4,
  금요일: 5,
  토요일: 6,
};

/**
 * WORSHIP_SERVICES.time 은 "주일 오전 11:00", "수요일 저녁 8:30", "매일 오전 6:00" 같은
 * 한국어 문자열이라 반복 규칙(요일/매일)과 시각 라벨로 분해한다. 못 읽으면 recurrence=null.
 */
export function parseWorshipTime(time: string): { recurrence: WorshipRecurrence | null; timeLabel: string } {
  const [first, ...rest] = time.trim().split(/\s+/);
  const timeLabel = rest.join(" ");
  if (first === "매일") return { recurrence: { kind: "daily" }, timeLabel };
  const weekday = WEEKDAY_TOKENS[first];
  if (weekday !== undefined) return { recurrence: { kind: "weekly", weekday }, timeLabel };
  return { recurrence: null, timeLabel: time.trim() };
}

function worshipEventType(service: WorshipService): CalendarEventType {
  return service.name.includes("기도") ? "prayer" : "worship";
}

/** 예배 반복 일정을 [start, end] (로컬 자정, 양끝 포함) 구간의 개별 날짜 이벤트로 전개한다. */
export function worshipEventsForRange(start: Date, end: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  WORSHIP_SERVICES.forEach((service, index) => {
    const { recurrence, timeLabel } = parseWorshipTime(service.time);
    if (!recurrence) return;
    for (let day = new Date(start.getFullYear(), start.getMonth(), start.getDate()); day <= end; day = addDays(day, 1)) {
      if (recurrence.kind === "weekly" && day.getDay() !== recurrence.weekday) continue;
      const dateKey = toDateKey(day);
      events.push({
        id: `worship-${index}-${dateKey}`,
        title: service.name,
        type: worshipEventType(service),
        startDate: dateKey,
        startTime: timeLabel || undefined,
        location: service.place,
        source: "worship",
        href: "/worship",
        isRecurring: true,
      });
    }
  });
  return events;
}

/** 해당 월(monthIndex: 0-11)의 예배 반복 일정 이벤트. */
export function mapWorshipToCalendarEvents(year: number, monthIndex: number): CalendarEvent[] {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  return worshipEventsForRange(first, last);
}

// ─── 대한민국 공휴일 (연도별 정적 테이블) ───
// TODO(공휴일: 이후 연도 추가 또는 API 연동)
// 음력 기반(설날·석가탄신일·추석)은 연도별 확정 날짜를 하드코딩한다. 2028년 이후는 아래 표에
// 연도를 추가하거나 공공데이터포털 특일 정보 API 연동으로 대체한다. 임시공휴일은 포함하지 않는다.

type HolidayDef = { date: string; name: string };

const KOREAN_HOLIDAYS: Record<number, HolidayDef[]> = {
  2025: [
    { date: "2025-01-01", name: "신정" },
    { date: "2025-01-28", name: "설날 연휴" },
    { date: "2025-01-29", name: "설날" },
    { date: "2025-01-30", name: "설날 연휴" },
    { date: "2025-03-01", name: "삼일절" },
    { date: "2025-03-03", name: "대체공휴일(삼일절)" },
    { date: "2025-05-05", name: "어린이날·석가탄신일" },
    { date: "2025-05-06", name: "대체공휴일(어린이날·석가탄신일)" },
    { date: "2025-06-06", name: "현충일" },
    { date: "2025-08-15", name: "광복절" },
    { date: "2025-10-03", name: "개천절" },
    { date: "2025-10-05", name: "추석 연휴" },
    { date: "2025-10-06", name: "추석" },
    { date: "2025-10-07", name: "추석 연휴" },
    { date: "2025-10-08", name: "대체공휴일(추석)" },
    { date: "2025-10-09", name: "한글날" },
    { date: "2025-12-25", name: "성탄절" },
  ],
  2026: [
    { date: "2026-01-01", name: "신정" },
    { date: "2026-02-16", name: "설날 연휴" },
    { date: "2026-02-17", name: "설날" },
    { date: "2026-02-18", name: "설날 연휴" },
    { date: "2026-03-01", name: "삼일절" },
    { date: "2026-03-02", name: "대체공휴일(삼일절)" },
    { date: "2026-05-05", name: "어린이날" },
    { date: "2026-05-24", name: "석가탄신일" },
    { date: "2026-05-25", name: "대체공휴일(석가탄신일)" },
    { date: "2026-06-06", name: "현충일" },
    { date: "2026-08-15", name: "광복절" },
    { date: "2026-08-17", name: "대체공휴일(광복절)" },
    { date: "2026-09-24", name: "추석 연휴" },
    { date: "2026-09-25", name: "추석" },
    { date: "2026-09-26", name: "추석 연휴" },
    { date: "2026-10-03", name: "개천절" },
    { date: "2026-10-05", name: "대체공휴일(개천절)" },
    { date: "2026-10-09", name: "한글날" },
    { date: "2026-12-25", name: "성탄절" },
  ],
  2027: [
    { date: "2027-01-01", name: "신정" },
    { date: "2027-02-06", name: "설날 연휴" },
    { date: "2027-02-07", name: "설날" },
    { date: "2027-02-08", name: "설날 연휴" },
    { date: "2027-02-09", name: "대체공휴일(설날)" },
    { date: "2027-03-01", name: "삼일절" },
    { date: "2027-05-05", name: "어린이날" },
    { date: "2027-05-13", name: "석가탄신일" },
    { date: "2027-06-06", name: "현충일" },
    { date: "2027-08-15", name: "광복절" },
    { date: "2027-08-16", name: "대체공휴일(광복절)" },
    { date: "2027-09-14", name: "추석 연휴" },
    { date: "2027-09-15", name: "추석" },
    { date: "2027-09-16", name: "추석 연휴" },
    { date: "2027-10-03", name: "개천절" },
    { date: "2027-10-04", name: "대체공휴일(개천절)" },
    { date: "2027-10-09", name: "한글날" },
    { date: "2027-10-11", name: "대체공휴일(한글날)" },
    { date: "2027-12-25", name: "성탄절" },
  ],
};

/** [start, end] 구간의 공휴일 이벤트. href 없음 — 공휴일은 클릭 대상이 아니다. */
export function holidayEventsForRange(start: Date, end: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (let year = start.getFullYear(); year <= end.getFullYear(); year += 1) {
    for (const holiday of KOREAN_HOLIDAYS[year] ?? []) {
      const day = parseDateKey(holiday.date);
      if (!day || day < start || day > end) continue;
      events.push({
        id: `holiday-${holiday.date}`,
        title: holiday.name,
        type: "holiday",
        startDate: holiday.date,
        source: "holiday",
      });
    }
  }
  return events;
}

// ─── 행사(Campaign) → 캘린더 이벤트 ───

/**
 * 행사 하나를 캘린더 이벤트로 변환한다.
 * - 진행 기간(runStart~runEnd): 범위 이벤트 1개 (월간 그리드에서는 각 날짜에 개별 표시).
 * - 신청 마감(recruitEnd): 종일 마감 이벤트 1개.
 * - 모집 시작일은 캘린더 노이즈라 생략(스펙) — D-day 라벨이 모집 시작을 이미 안내한다.
 * status 라벨은 campaignLifecycle() 재사용 — 카드·상세와 동일 기준.
 */
export function mapCampaignToCalendarEvents(campaign: Campaign): CalendarEvent[] {
  const lifecycle = campaignLifecycle(campaign);
  const events: CalendarEvent[] = [];
  const href = `/campaigns/${campaign.id}`;

  if (isIsoDate(campaign.runStart)) {
    const endDate = isIsoDate(campaign.runEnd) && campaign.runEnd > campaign.runStart ? campaign.runEnd : undefined;
    events.push({
      id: `campaign-${campaign.id}-run`,
      title: campaign.title,
      type: "event",
      startDate: campaign.runStart,
      endDate,
      location: campaign.place ?? undefined,
      source: "campaign",
      sourceId: campaign.id,
      href,
      status: lifecycle.dday,
    });
  }

  if (isIsoDate(campaign.recruitEnd) && lifecycle.phase !== "ended") {
    events.push({
      id: `campaign-${campaign.id}-deadline`,
      title: `${campaign.title} 신청 마감`,
      type: "deadline",
      startDate: campaign.recruitEnd,
      source: "campaign",
      sourceId: campaign.id,
      href,
      status: lifecycle.dday,
    });
  }

  return events;
}

// ─── 찬양팀 일정 → 캘린더 이벤트 ───

/**
 * 찬양팀 일정(GET /api/praise/schedules/public)을 캘린더 이벤트로 변환한다.
 * 노출 범위는 서버가 요청자별로 이미 좁혀서 내려준다(비로그인 PUBLIC / 로그인 CHURCH+PUBLIC /
 * 찬양팀 멤버 PRIVATE 포함 전체) — 프론트는 받은 것을 그대로 그린다.
 * href 는 찬양팀 멤버에게만 준다(내부 일정 페이지는 가드가 있어 비멤버 클릭은 안내만 보게 된다).
 */
export function mapPraiseScheduleToCalendarEvents(
  schedules: import("@/data/praise-team").PraiseSchedule[],
  options: { linkToPraiseTeam?: boolean } = {},
): CalendarEvent[] {
  return schedules.map((schedule) => {
    const start = new Date(schedule.startAt);
    const valid = !Number.isNaN(start.getTime());
    return {
      id: `praise-${schedule.id}`,
      title: schedule.title,
      type: "praise" as const,
      startDate: valid ? toDateKey(start) : schedule.startAt.slice(0, 10),
      startTime: valid
        ? start.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
        : undefined,
      location: schedule.location ?? undefined,
      source: "manual" as const,
      href: options.linkToPraiseTeam ? "/praise-team/schedule" : undefined,
    };
  });
}

// ─── 조회 (월간 그리드 · 이번 주 리스트) ───

/** 셀 안 표시 우선순위 — 공휴일 > 마감 > 행사 > 예배 > 기도회 > 기타. 동순위는 시각 → 제목순. */
const TYPE_PRIORITY: Record<CalendarEventType, number> = {
  holiday: 0,
  deadline: 1,
  event: 2,
  worship: 3,
  prayer: 4,
  praise: 5,
  "new-family": 5,
  service: 5,
  etc: 6,
};

export function compareCalendarEvents(a: CalendarEvent, b: CalendarEvent): number {
  const priority = TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type];
  if (priority !== 0) return priority;
  const time = (a.startTime ?? "").localeCompare(b.startTime ?? "", "ko");
  if (time !== 0) return time;
  return a.title.localeCompare(b.title, "ko");
}

/** 이벤트(범위 포함)를 [start, end] 구간의 dateKey → 정렬된 이벤트 목록 맵으로 전개한다. */
function expandByDate(events: CalendarEvent[], start: Date, end: Date): Map<string, CalendarEvent[]> {
  const byDate = new Map<string, CalendarEvent[]>();
  const push = (key: string, event: CalendarEvent) => {
    const list = byDate.get(key);
    if (list) list.push(event);
    else byDate.set(key, [event]);
  };

  for (const event of events) {
    const eventStart = parseDateKey(event.startDate);
    if (!eventStart) continue;
    const eventEnd = event.endDate ? parseDateKey(event.endDate) ?? eventStart : eventStart;
    // 여러 날 행사는 각 날짜에 표시(연속 바 없이 간단화).
    for (let day = eventStart < start ? new Date(start) : eventStart; day <= end && day <= eventEnd; day = addDays(day, 1)) {
      push(toDateKey(day), event);
    }
  }

  for (const list of byDate.values()) list.sort(compareCalendarEvents);
  return byDate;
}

export type MonthEventsOptions = {
  /** 새벽 기도회 등 매일 반복 일정 포함 여부 — 월간 그리드에서는 기본 숨김(칸 포화 방지). */
  includeDaily?: boolean;
  /** 추가 이벤트(찬양팀 일정 등 — 호출부가 fetch·매핑해서 넘긴다). 범위 밖 날짜는 자동 제외. */
  extraEvents?: CalendarEvent[];
};

/** 해당 월의 날짜별 이벤트 맵 (공휴일 + 예배 반복 + 행사 + extraEvents). key = yyyy-MM-dd. */
export function getEventsForMonth(
  campaigns: Campaign[],
  year: number,
  monthIndex: number,
  options: MonthEventsOptions = {},
): Map<string, CalendarEvent[]> {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const worship = mapWorshipToCalendarEvents(year, monthIndex).filter(
    (event) => options.includeDaily || event.type !== "prayer",
  );
  const campaignEvents = campaigns.flatMap(mapCampaignToCalendarEvents);
  return expandByDate(
    [...holidayEventsForRange(first, last), ...worship, ...campaignEvents, ...(options.extraEvents ?? [])],
    first,
    last,
  );
}

export type WeekDayEvents = { dateKey: string; events: CalendarEvent[] };

/**
 * "이번 주" 일정: 오늘부터 이번 주 일요일(한국 관례 — 주의 끝)까지 날짜별 그룹.
 * 새벽 기도회(매일 반복)도 포함한다. 일정이 없는 날짜는 결과에서 제외.
 */
export function getEventsForWeek(
  campaigns: Campaign[],
  today: Date = new Date(),
  extraEvents: CalendarEvent[] = [],
): WeekDayEvents[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // 오늘이 일요일이면 오늘 하루, 아니면 다가오는 일요일까지.
  const end = start.getDay() === 0 ? start : addDays(start, 7 - start.getDay());
  const worship = worshipEventsForRange(start, end);
  const campaignEvents = campaigns.flatMap(mapCampaignToCalendarEvents);
  const byDate = expandByDate(
    [...holidayEventsForRange(start, end), ...worship, ...campaignEvents, ...extraEvents],
    start,
    end,
  );

  const days: WeekDayEvents[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const dateKey = toDateKey(day);
    const events = byDate.get(dateKey);
    if (events && events.length > 0) days.push({ dateKey, events });
  }
  return days;
}

// ─── 표시 메타 (라벨·색 — CSS 토큰만, 새 원색 도입 없음) ───

const TYPE_LABELS: Record<CalendarEventType, string> = {
  worship: "예배",
  event: "행사",
  "new-family": "새가족",
  service: "봉사",
  prayer: "기도회",
  praise: "찬양팀",
  deadline: "신청 마감",
  holiday: "공휴일",
  etc: "기타",
};

export function eventTypeLabel(type: CalendarEventType): string {
  return TYPE_LABELS[type];
}

/** 배지·칩 배경/글자색. 예배=잉크(네이비 계열) 틴트, 행사=골드 소프트, 마감=danger 소프트. */
export function eventTypeStyle(type: CalendarEventType): { background: string; color: string } {
  switch (type) {
    case "worship":
      return { background: "rgba(var(--ink-rgb), 0.08)", color: "var(--heading)" };
    case "prayer":
      return { background: "var(--chip-bg)", color: "var(--foreground-muted)" };
    case "praise":
      // 행사(골드 소프트 배경)와 구분 — 배경 없이 골드 텍스트만(골드는 "한 줄" 규칙).
      return { background: "var(--chip-bg)", color: "var(--accent-strong)" };
    case "event":
      return { background: "var(--accent-soft)", color: "var(--accent-strong)" };
    case "deadline":
      return { background: "var(--danger-soft)", color: "var(--danger)" };
    case "holiday":
      // 마감(배경 있는 danger 칩)과 구분 — 배경 없이 텍스트만 붉은 톤.
      return { background: "transparent", color: "var(--danger)" };
    default:
      return { background: "var(--chip-bg)", color: "var(--foreground)" };
  }
}

/** 모바일 그리드 셀의 타입 컬러 점. */
export function eventTypeDotColor(type: CalendarEventType): string {
  switch (type) {
    case "worship":
      return "var(--heading)";
    case "event":
      return "var(--accent)";
    case "deadline":
    case "holiday":
      return "var(--danger)";
    default:
      return "var(--foreground-muted)";
  }
}
