import { describe, expect, it } from "vitest";
import { devotionDateLabel, devotionShortDate } from "./devotion";

describe("devotionDateLabel", () => {
  it("LocalDate 를 한국어 날짜+요일로 포맷한다(시간대 무의존)", () => {
    // 2026-07-20 은 월요일.
    expect(devotionDateLabel("2026-07-20")).toBe("2026년 7월 20일 (월)");
    // 2026-07-19 는 일요일.
    expect(devotionDateLabel("2026-07-19")).toBe("2026년 7월 19일 (일)");
  });

  it("잘못된 값은 원본을 그대로 돌려준다", () => {
    expect(devotionDateLabel("내일")).toBe("내일");
  });

  it("짧은 라벨은 월.일 (요일)", () => {
    expect(devotionShortDate("2026-07-20")).toBe("7.20 (월)");
  });
});
