import { describe, expect, it } from "vitest";
import type { Event } from "./events";
import {
  addDays,
  compareCalendarEvents,
  formatDateLabel,
  getEventsForMonth,
  mapEventToCalendarEvents,
  parseDateKey,
  parseWorshipTime,
  toDateKey,
  type CalendarEvent,
  type CalendarEventType,
} from "./calendar";

function ev(overrides: Partial<Event> = {}): Event {
  return {
    id: "e1",
    status: "open",
    title: "여름 수련회",
    summary: "",
    thumb: "",
    recruitStart: "",
    recruitEnd: "",
    runStart: "2026-07-10",
    runEnd: "2026-07-12",
    capacity: 20,
    joined: 5,
    daysLeftLabel: "",
    recruitable: true,
    recruitState: "recruiting",
    author: { name: "리더", verified: true },
    body: { heading: "", paragraphs: [], images: [] },
    joinedByMe: false,
    bookmarkedByMe: false,
    ownedByMe: false,
    ...overrides,
  };
}

function cal(type: CalendarEventType, extra: Partial<CalendarEvent> = {}): CalendarEvent {
  return { id: type, title: type, type, startDate: "2026-07-10", source: "event", ...extra };
}

describe("toDateKey / parseDateKey", () => {
  it("toDateKey 는 로컬 yyyy-MM-dd", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
  it("parseDateKey 는 형식 검증 후 로컬 자정 Date, 왕복 일치", () => {
    const d = parseDateKey("2026-07-15");
    expect(d).not.toBeNull();
    expect(toDateKey(d as Date)).toBe("2026-07-15");
  });
  it("잘못된 키는 null", () => {
    expect(parseDateKey("2026-13-01")).toBeNull();
    expect(parseDateKey("2026-02-30")).toBeNull();
    expect(parseDateKey("nope")).toBeNull();
  });
});

describe("addDays", () => {
  it("월·연 경계를 넘긴다(입력 불변)", () => {
    const base = new Date(2026, 0, 31); // 1/31
    expect(toDateKey(addDays(base, 1))).toBe("2026-02-01");
    expect(toDateKey(base)).toBe("2026-01-31"); // 원본 유지
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(toDateKey(addDays(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
  });
});

describe("formatDateLabel", () => {
  it("유효 키는 'N월 N일 (요일)' 형식", () => {
    const label = formatDateLabel("2026-07-11");
    expect(label).toMatch(/^7월 11일 \([일월화수목금토]\)$/);
  });
  it("형식이 틀리면 키 원문을 그대로", () => {
    expect(formatDateLabel("2026-13-99")).toBe("2026-13-99");
  });
});

describe("parseWorshipTime", () => {
  it("주일 → 일요일 주간 반복", () => {
    expect(parseWorshipTime("주일 오전 11:00")).toEqual({
      recurrence: { kind: "weekly", weekday: 0 },
      timeLabel: "오전 11:00",
    });
  });
  it("요일 토큰 매핑", () => {
    expect(parseWorshipTime("수요일 저녁 8:30").recurrence).toEqual({ kind: "weekly", weekday: 3 });
    expect(parseWorshipTime("토요일 오후 3시").recurrence).toEqual({ kind: "weekly", weekday: 6 });
  });
  it("매일 → daily", () => {
    expect(parseWorshipTime("매일 오전 6:00")).toEqual({
      recurrence: { kind: "daily" },
      timeLabel: "오전 6:00",
    });
  });
  it("못 읽으면 recurrence=null·원문 라벨", () => {
    expect(parseWorshipTime("언젠가 오전")).toEqual({ recurrence: null, timeLabel: "언젠가 오전" });
  });
});

describe("compareCalendarEvents", () => {
  it("타입 우선순위: 공휴일 < 마감 < 행사 < 예배", () => {
    expect(compareCalendarEvents(cal("holiday"), cal("event"))).toBeLessThan(0);
    expect(compareCalendarEvents(cal("deadline"), cal("worship"))).toBeLessThan(0);
    expect(compareCalendarEvents(cal("event"), cal("holiday"))).toBeGreaterThan(0);
  });
  it("동순위는 시각 → 제목순", () => {
    const early = cal("worship", { startTime: "오전 9:00", title: "나" });
    const late = cal("worship", { startTime: "오후 2:00", title: "가" });
    expect(compareCalendarEvents(early, late)).toBeLessThan(0); // 오전 < 오후
    const a = cal("worship", { startTime: "오전 9:00", title: "가나" });
    const b = cal("worship", { startTime: "오전 9:00", title: "다라" });
    expect(compareCalendarEvents(a, b)).toBeLessThan(0); // 제목 가나다순
  });
});

describe("mapEventToCalendarEvents", () => {
  it("진행 기간 이벤트에 endDate 는 runEnd>runStart 일 때만", () => {
    const multi = mapEventToCalendarEvents(ev({ runStart: "2099-06-01", runEnd: "2099-06-03" }));
    expect(multi.find((e) => e.type === "event")?.endDate).toBe("2099-06-03");

    const single = mapEventToCalendarEvents(ev({ runStart: "2099-06-01", runEnd: "2099-06-01" }));
    expect(single.find((e) => e.type === "event")?.endDate).toBeUndefined();
  });
  it("종료된 행사는 신청 마감 이벤트를 내지 않는다", () => {
    const ended = mapEventToCalendarEvents(
      ev({ runStart: "2020-01-01", runEnd: "2020-01-05", recruitEnd: "2020-01-01" }),
    );
    expect(ended.some((e) => e.type === "deadline")).toBe(false);
    expect(ended.some((e) => e.type === "event")).toBe(true);
  });
  it("모집 중 미래 행사는 신청 마감 이벤트를 낸다", () => {
    const future = mapEventToCalendarEvents(
      ev({ runStart: "2099-06-01", runEnd: "2099-06-03", recruitEnd: "2099-05-01", recruitState: "recruiting" }),
    );
    const deadline = future.find((e) => e.type === "deadline");
    expect(deadline?.startDate).toBe("2099-05-01");
  });
  it("runStart 가 유효하지 않으면 진행 이벤트 없음", () => {
    expect(mapEventToCalendarEvents(ev({ runStart: "" })).some((e) => e.type === "event")).toBe(false);
  });
});

describe("getEventsForMonth — 여러 날 행사 전개와 창(window) 클램프", () => {
  function runDays(map: Map<string, CalendarEvent[]>, eventId: string): string[] {
    const runId = `event-${eventId}-run`;
    return [...map.entries()]
      .filter(([, list]) => list.some((e) => e.id === runId))
      .map(([key]) => key)
      .sort();
  }

  it("월 안에 완전히 든 행사는 각 날짜에 표시", () => {
    const map = getEventsForMonth([ev({ id: "x", runStart: "2026-07-10", runEnd: "2026-07-12" })], 2026, 6);
    expect(runDays(map, "x")).toEqual(["2026-07-10", "2026-07-11", "2026-07-12"]);
  });

  it("월 시작 이전에 시작한 행사는 그 달 1일부터 클램프", () => {
    // 6/28~7/2 → 7월(monthIndex=6) 페이지에는 7/1, 7/2 만.
    const map = getEventsForMonth([ev({ id: "x", runStart: "2026-06-28", runEnd: "2026-07-02" })], 2026, 6);
    expect(runDays(map, "x")).toEqual(["2026-07-01", "2026-07-02"]);
  });

  it("월 종료 이후까지 가는 행사는 말일까지 클램프", () => {
    // 6/28~7/2 → 6월(monthIndex=5) 페이지에는 6/28,29,30 만.
    const map = getEventsForMonth([ev({ id: "x", runStart: "2026-06-28", runEnd: "2026-07-02" })], 2026, 5);
    expect(runDays(map, "x")).toEqual(["2026-06-28", "2026-06-29", "2026-06-30"]);
  });

  it("includeDaily 기본은 매일 기도회(prayer)를 제외한다", () => {
    const map = getEventsForMonth([], 2026, 6);
    const all = [...map.values()].flat();
    expect(all.some((e) => e.type === "prayer")).toBe(false);
  });
});
