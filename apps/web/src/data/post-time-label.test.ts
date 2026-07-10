import { describe, expect, it } from "vitest";
import { postTimeLabel } from "./posts";

describe("postTimeLabel", () => {
  it("createdAt 이 있으면 KST 절대 시각으로 표기한다", () => {
    // 2026-07-10T06:05:00Z = KST 2026.7.10 15:05
    expect(postTimeLabel({ createdAt: "2026-07-10T06:05:00Z", time: "방금 전" })).toBe("2026.7.10 15:05");
  });

  it("자정 전후 KST 날짜 넘김이 정확하다", () => {
    // 2026-12-31T15:30:00Z = KST 2027.1.1 00:30
    expect(postTimeLabel({ createdAt: "2026-12-31T15:30:00Z", time: "" })).toBe("2027.1.1 00:30");
  });

  it("createdAt 이 없으면(시드) 저장된 time 라벨을 그대로 쓴다", () => {
    expect(postTimeLabel({ createdAt: null, time: "2시간 전" })).toBe("2시간 전");
    expect(postTimeLabel({ time: "어제" })).toBe("어제");
  });

  it("잘못된 createdAt 은 time 라벨로 폴백한다", () => {
    expect(postTimeLabel({ createdAt: "not-a-date", time: "5시간 전" })).toBe("5시간 전");
  });
});
