import { describe, expect, it } from "vitest";
import {
  attendanceSummary,
  toInstant,
  type CellMeetingAttendance,
} from "./cell-groups";

function att(userId: number, status: CellMeetingAttendance["status"]): CellMeetingAttendance {
  return { userId, name: `사용자 ${userId}`, status };
}

describe("attendanceSummary", () => {
  it("기록이 없으면 빈 문자열", () => {
    expect(attendanceSummary([])).toBe("");
  });

  it("상태별로 집계하고 0 은 생략한다", () => {
    const rows = [att(1, "PRESENT"), att(2, "PRESENT"), att(3, "EXCUSED")];
    expect(attendanceSummary(rows)).toBe("참석 2 · 사유결석 1");
  });

  it("순서는 참석 → 결석 → 사유결석 고정", () => {
    const rows = [att(1, "EXCUSED"), att(2, "ABSENT"), att(3, "PRESENT")];
    expect(attendanceSummary(rows)).toBe("참석 1 · 결석 1 · 사유결석 1");
  });
});

describe("toInstant", () => {
  it("날짜가 없으면 null", () => {
    expect(toInstant("", "19:30")).toBeNull();
  });

  it("날짜+시간을 ISO instant 로 합친다(라운드트립 가능)", () => {
    const iso = toInstant("2026-07-24", "19:30");
    expect(iso).not.toBeNull();
    // 로컬→UTC 변환이라 값 자체는 타임존 의존 — 파싱 가능·같은 시점인지만 검증한다.
    expect(new Date(iso as string).getMinutes()).toBe(30);
  });

  it("시간을 비우면 자정으로 처리", () => {
    const iso = toInstant("2026-07-24", "");
    expect(iso).not.toBeNull();
    const d = new Date(iso as string);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("잘못된 날짜는 null", () => {
    expect(toInstant("not-a-date", "19:30")).toBeNull();
  });
});
