import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  pickUpcomingSetlist,
  scheduleDateKey,
  sortPraiseNotices,
  type PraiseNotice,
  type PraiseSetlistStatus,
  type PraiseSetlistSummary,
} from "./praise-team";

function summary(
  worshipDate: string,
  overrides: Partial<PraiseSetlistSummary> = {},
): PraiseSetlistSummary {
  return {
    id: `s-${worshipDate}`,
    title: `콘티 ${worshipDate}`,
    worshipDate,
    worshipType: "주일 2부 예배",
    status: "CONFIRMED" as PraiseSetlistStatus,
    songCount: 3,
    assignmentCount: 4,
    createdAt: `${worshipDate}T00:00:00Z`,
    ...overrides,
  };
}

describe("pickUpcomingSetlist", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 로컬 생성자로 고정 → 어느 타임존에서도 todayKey()는 "2026-07-15".
    vi.setSystemTime(new Date(2026, 6, 15, 12, 0, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("빈 목록이면 null", () => {
    expect(pickUpcomingSetlist([])).toBeNull();
  });

  it("전부 ARCHIVED 면 null", () => {
    expect(
      pickUpcomingSetlist([
        summary("2026-07-19", { status: "ARCHIVED" }),
        summary("2026-07-12", { status: "ARCHIVED" }),
      ]),
    ).toBeNull();
  });

  it("오늘 이후 가장 가까운 콘티를 고른다(더 먼 미래 무시)", () => {
    const pick = pickUpcomingSetlist([
      summary("2026-08-02"),
      summary("2026-07-19"),
      summary("2026-07-26"),
    ]);
    expect(pick?.worshipDate).toBe("2026-07-19");
  });

  it("오늘 당일 콘티도 '다가오는'으로 본다", () => {
    const pick = pickUpcomingSetlist([summary("2026-07-15"), summary("2026-07-26")]);
    expect(pick?.worshipDate).toBe("2026-07-15");
  });

  it("다가오는 게 없으면 가장 최근 지난 콘티로 폴백한다", () => {
    const pick = pickUpcomingSetlist([summary("2026-07-05"), summary("2026-07-12"), summary("2026-06-28")]);
    expect(pick?.worshipDate).toBe("2026-07-12");
  });

  it("ARCHIVED 는 다가오는 후보에서도 제외된다", () => {
    const pick = pickUpcomingSetlist([
      summary("2026-07-19", { status: "ARCHIVED" }),
      summary("2026-07-26"),
    ]);
    expect(pick?.worshipDate).toBe("2026-07-26");
  });
});

describe("sortPraiseNotices", () => {
  function notice(id: string, date: string, pinned?: boolean): PraiseNotice {
    return { id, title: id, body: "", author: "리더", date, pinned };
  }

  it("고정 공지가 날짜와 무관하게 먼저 온다", () => {
    const sorted = sortPraiseNotices([
      notice("a", "2026-07-20"),
      notice("b", "2026-07-01", true),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("같은 고정 그룹 안에서는 최신 날짜가 먼저", () => {
    const sorted = sortPraiseNotices([
      notice("old", "2026-07-01"),
      notice("new", "2026-07-20"),
      notice("mid", "2026-07-10"),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(["new", "mid", "old"]);
  });

  it("입력 배열을 변형하지 않는다", () => {
    const input = [notice("a", "2026-07-01"), notice("b", "2026-07-20", true)];
    const before = input.map((n) => n.id);
    sortPraiseNotices(input);
    expect(input.map((n) => n.id)).toEqual(before);
  });
});

describe("scheduleDateKey", () => {
  it("파싱 불가한 값은 앞 10자로 폴백한다(타임존 무관)", () => {
    expect(scheduleDateKey("nonsense-value-here")).toBe("nonsense-v");
    expect(scheduleDateKey("2026-07-19-garbage")).toBe("2026-07-19");
  });
});
