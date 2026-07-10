import { describe, expect, it } from "vitest";
import { verseOfMonth } from "./church";

describe("verseOfMonth — 월 경계 KST 고정", () => {
  it("UTC 로는 전월이어도 KST 로 새 달이면 새 달의 말씀을 준다", () => {
    // 2026-06-30T15:30Z = 2026-07-01 00:30 KST → 7월(6번 인덱스)
    const utcJuneKstJuly = new Date("2026-06-30T15:30:00Z");
    expect(verseOfMonth(utcJuneKstJuly)).not.toBe(verseOfMonth(new Date("2026-06-15T12:00:00Z")));
    expect(verseOfMonth(utcJuneKstJuly)).toBe(verseOfMonth(new Date("2026-07-15T12:00:00Z")));
  });

  it("월 중순은 시간대와 무관하게 같은 달", () => {
    expect(verseOfMonth(new Date("2026-03-15T00:00:00Z"))).toBe(verseOfMonth(new Date("2026-03-15T23:00:00Z")));
  });
});
