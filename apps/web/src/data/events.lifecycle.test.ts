import { describe, expect, it } from "vitest";
import {
  eventDateRangeError,
  eventLifecycle,
  eventProgressLabel,
  isIsoDate,
  readEventDateRangeFilters,
  type Event,
  type EventDateRangeFilters,
} from "./events";

// 기준일: 2026-07-15 (UTC 자정). eventLifecycle 은 todayMs 를 주입받으므로 타임존 무관.
const TODAY = Date.UTC(2026, 6, 15);

function ev(overrides: Partial<Event> = {}): Event {
  return {
    id: "e1",
    status: "open",
    title: "행사",
    summary: "",
    thumb: "",
    recruitStart: "2026-07-01",
    recruitEnd: "2026-07-31",
    runStart: "2026-08-01",
    runEnd: "2026-08-05",
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

describe("eventLifecycle — 진행 기간 기준(모집 상태보다 우선)", () => {
  it("진행 종료일이 지나면 종료", () => {
    const l = eventLifecycle(ev({ runStart: "2026-07-01", runEnd: "2026-07-10" }), TODAY);
    expect(l.phase).toBe("ended");
    expect(l.dday).toBe("종료된 행사입니다");
  });

  it("진행 기간 안이면 모집중이라도 '진행중'이 이긴다", () => {
    const l = eventLifecycle(
      ev({ runStart: "2026-07-10", runEnd: "2026-07-20", recruitState: "recruiting", recruitable: true }),
      TODAY,
    );
    expect(l.phase).toBe("running");
    expect(l.dday).toBe("행사 종료까지 D-5");
  });

  it("진행 종료일 당일은 '오늘 행사 종료'", () => {
    const l = eventLifecycle(ev({ runStart: "2026-07-10", runEnd: "2026-07-15" }), TODAY);
    expect(l.phase).toBe("running");
    expect(l.dday).toBe("오늘 행사 종료");
  });

  it("진행 종료일이 없으면(빈 값) '진행 중인 행사입니다'", () => {
    const l = eventLifecycle(ev({ runStart: "2026-07-10", runEnd: "" }), TODAY);
    expect(l.phase).toBe("running");
    expect(l.dday).toBe("진행 중인 행사입니다");
  });
});

describe("eventLifecycle — 진행 시작 전: 모집 상태 기준", () => {
  const future = { runStart: "2026-08-01", runEnd: "2026-08-05" };

  it("모집예정 + 모집 시작일 미래 → D-day", () => {
    const l = eventLifecycle(
      ev({ ...future, recruitState: "before_recruit", recruitStart: "2026-07-20" }),
      TODAY,
    );
    expect(l.phase).toBe("before_recruit");
    expect(l.dday).toBe("모집 시작까지 D-5");
  });

  it("모집예정 + 모집 시작일 지남/미정 → '모집 시작 예정'", () => {
    const l = eventLifecycle(
      ev({ ...future, recruitState: "before_recruit", recruitStart: "2026-07-10" }),
      TODAY,
    );
    expect(l.dday).toBe("모집 시작 예정");
  });

  it("모집중(recruitable) + 마감일 미래 → D-day", () => {
    const l = eventLifecycle(
      ev({ ...future, recruitState: "recruiting", recruitable: true, recruitEnd: "2026-07-25" }),
      TODAY,
    );
    expect(l.phase).toBe("recruiting");
    expect(l.dday).toBe("모집 마감까지 D-10");
  });

  it("모집중 + 마감일 당일/지남 → '오늘 모집 마감'", () => {
    const l = eventLifecycle(
      ev({ ...future, recruitState: "recruiting", recruitable: true, recruitEnd: "2026-07-15" }),
      TODAY,
    );
    expect(l.dday).toBe("오늘 모집 마감");
  });

  it("모집중 + 마감일 없음 → '모집 중'", () => {
    const l = eventLifecycle(
      ev({ ...future, recruitState: "recruiting", recruitable: true, recruitEnd: "" }),
      TODAY,
    );
    expect(l.dday).toBe("모집 중");
  });
});

describe("eventLifecycle — 모집 종료 후 행사 시작 전(모집마감)", () => {
  it("모집 마감(closed) → 행사 시작까지 D-day", () => {
    const l = eventLifecycle(
      ev({ runStart: "2026-08-01", runEnd: "2026-08-05", recruitState: "closed" }),
      TODAY,
    );
    expect(l.phase).toBe("recruit_closed");
    expect(l.badge.label).toBe("모집마감");
    expect(l.dday).toBe("행사 시작까지 D-17");
  });

  it("정원마감(recruiting·recruitable=false·정원 초과) 배지", () => {
    const l = eventLifecycle(
      ev({
        runStart: "2026-08-01",
        runEnd: "2026-08-05",
        recruitState: "recruiting",
        recruitable: false,
        capacity: 10,
        joined: 10,
      }),
      TODAY,
    );
    expect(l.phase).toBe("recruit_closed");
    expect(l.badge.label).toBe("정원마감");
  });

  it("진행 시작일 미정(빈 값) → '행사 시작 대기'", () => {
    const l = eventLifecycle(
      ev({ runStart: "", runEnd: "", recruitState: "ended" }),
      TODAY,
    );
    expect(l.phase).toBe("recruit_closed");
    expect(l.dday).toBe("행사 시작 대기");
  });
});

describe("isIsoDate", () => {
  it("정상 날짜", () => {
    expect(isIsoDate("2026-07-15")).toBe(true);
    expect(isIsoDate("2026-01-31")).toBe(true);
  });
  it("형식 불일치", () => {
    expect(isIsoDate("2026-7-15")).toBe(false);
    expect(isIsoDate("20260715")).toBe(false);
    expect(isIsoDate("2026-07-15T00:00")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
  it("범위 밖 월·일", () => {
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-00-10")).toBe(false);
    expect(isIsoDate("2026-04-31")).toBe(false);
    expect(isIsoDate("2026-01-00")).toBe(false);
  });
  it("윤년 2월 29일", () => {
    expect(isIsoDate("2024-02-29")).toBe(true); // 윤년
    expect(isIsoDate("2026-02-29")).toBe(false); // 평년
    expect(isIsoDate("2000-02-29")).toBe(true); // 400 배수 윤년
    expect(isIsoDate("1900-02-29")).toBe(false); // 100 배수·400 아님 → 평년
  });
});

describe("eventDateRangeError", () => {
  const empty: EventDateRangeFilters = {
    recruitEndFrom: "",
    recruitEndTo: "",
    runStartFrom: "",
    runStartTo: "",
  };
  it("정상/부분 입력은 null", () => {
    expect(eventDateRangeError(empty)).toBeNull();
    expect(eventDateRangeError({ ...empty, recruitEndFrom: "2026-07-01" })).toBeNull();
    expect(eventDateRangeError({ ...empty, recruitEndFrom: "2026-07-01", recruitEndTo: "2026-07-31" })).toBeNull();
  });
  it("모집 마감 범위 역전", () => {
    expect(
      eventDateRangeError({ ...empty, recruitEndFrom: "2026-07-31", recruitEndTo: "2026-07-01" }),
    ).toContain("모집 마감일");
  });
  it("진행 시작 범위 역전", () => {
    expect(
      eventDateRangeError({ ...empty, runStartFrom: "2026-08-10", runStartTo: "2026-08-01" }),
    ).toContain("진행 시작일");
  });
});

describe("eventProgressLabel", () => {
  it("정원 미정(<=0)이면 null", () => {
    expect(eventProgressLabel(ev({ capacity: 0, joined: 3 }))).toBeNull();
  });
  it("퍼센트 반올림", () => {
    expect(eventProgressLabel(ev({ capacity: 3, joined: 1 }))).toBe("33% 모집 완료");
    expect(eventProgressLabel(ev({ capacity: 8, joined: 3 }))).toBe("38% 모집 완료");
  });
  it("정원 초과는 100% 로 클램프", () => {
    expect(eventProgressLabel(ev({ capacity: 10, joined: 25 }))).toBe("100% 모집 완료");
  });
});

describe("readEventDateRangeFilters", () => {
  it("유효한 값만 통과, 나머지는 빈 문자열", () => {
    const map = new Map<string, string>([
      ["recruitEndFrom", "2026-07-01"],
      ["recruitEndTo", "not-a-date"],
      ["runStartFrom", "  2026-08-01  "],
    ]);
    const filters = readEventDateRangeFilters({ get: (k) => map.get(k) ?? null });
    expect(filters.recruitEndFrom).toBe("2026-07-01");
    expect(filters.recruitEndTo).toBe(""); // 유효성 실패
    expect(filters.runStartFrom).toBe("2026-08-01"); // trim
    expect(filters.runStartTo).toBe(""); // 없음
  });
});
