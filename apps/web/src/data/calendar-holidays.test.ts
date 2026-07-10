import { describe, expect, it } from "vitest";
import { holidayEventsForRange } from "./calendar";

function holidaysOfYear(year: number) {
  return holidayEventsForRange(new Date(year, 0, 1), new Date(year, 11, 31));
}

describe("KOREAN_HOLIDAYS 정적 테이블", () => {
  it("2025–2030년을 커버하고 매년 핵심 공휴일이 있다", () => {
    for (let year = 2025; year <= 2030; year += 1) {
      const names = holidaysOfYear(year).map((h) => h.title);
      expect(names.length, `${year}년 누락`).toBeGreaterThanOrEqual(10);
      expect(names.some((n) => n.includes("설날")), `${year}년 설날`).toBe(true);
      expect(names.some((n) => n.includes("추석")), `${year}년 추석`).toBe(true);
      expect(names, `${year}년 성탄절`).toContain("성탄절");
    }
  });

  it("모든 날짜가 해당 연도의 유효한 날짜다", () => {
    for (let year = 2025; year <= 2030; year += 1) {
      for (const h of holidaysOfYear(year)) {
        const parsed = new Date(`${h.startDate}T00:00:00`);
        expect(Number.isNaN(parsed.getTime()), `${h.startDate} 파싱 실패`).toBe(false);
        expect(parsed.getFullYear(), `${h.startDate} 연도 불일치`).toBe(year);
      }
    }
  });

  it("대체공휴일은 주말(토·일)에 오지 않는다", () => {
    for (let year = 2025; year <= 2030; year += 1) {
      for (const h of holidaysOfYear(year)) {
        if (!h.title.startsWith("대체공휴일")) continue;
        const day = new Date(`${h.startDate}T00:00:00`).getDay();
        expect(day, `${h.startDate} ${h.title}이 주말`).toBeGreaterThanOrEqual(1);
        expect(day, `${h.startDate} ${h.title}이 주말`).toBeLessThanOrEqual(5);
      }
    }
  });

  it("검증된 2029·2030 확정 날짜와 일치한다 (설날·추석·석가탄신일)", () => {
    const y2029 = holidaysOfYear(2029);
    expect(y2029.find((h) => h.title === "설날")?.startDate).toBe("2029-02-13");
    expect(y2029.find((h) => h.title === "추석")?.startDate).toBe("2029-09-22");
    expect(y2029.find((h) => h.title === "석가탄신일")?.startDate).toBe("2029-05-20");
    // 추석 연휴 셋째 날이 일요일 → 대체공휴일 월요일
    expect(y2029.find((h) => h.title === "대체공휴일(추석)")?.startDate).toBe("2029-09-24");

    const y2030 = holidaysOfYear(2030);
    expect(y2030.find((h) => h.title === "설날")?.startDate).toBe("2030-02-03");
    expect(y2030.find((h) => h.title === "추석")?.startDate).toBe("2030-09-12");
    expect(y2030.find((h) => h.title === "석가탄신일")?.startDate).toBe("2030-05-09");
    // 설날 당일이 일요일 → 대체공휴일 화요일(연휴 다음의 첫 비공휴일)
    expect(y2030.find((h) => h.title === "대체공휴일(설날)")?.startDate).toBe("2030-02-05");
  });
});
