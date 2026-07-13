import { describe, expect, it } from "vitest";
import { postCategoryBadge, postCategoryLabel, postTimeLabel } from "./posts";

// 표시 헬퍼(카테고리 라벨·배지, 시각 표기) 계약 고정.
// 검증(validatePostCompose·normalize*)은 posts.validation.test.ts 가 담당 — 여기선 중복하지 않는다.

describe("postTimeLabel", () => {
  // createdAt 이 없거나(시드·이전 캐시) 무효면 저장된 time 라벨을 그대로 쓴다.
  it("createdAt 이 undefined 면 time 라벨을 그대로 반환", () => {
    expect(postTimeLabel({ time: "3일 전" })).toBe("3일 전");
  });

  it("createdAt 이 null 이면 time 라벨을 그대로 반환", () => {
    expect(postTimeLabel({ time: "방금", createdAt: null })).toBe("방금");
  });

  it("createdAt 이 빈 문자열이면 time 라벨을 그대로 반환", () => {
    expect(postTimeLabel({ time: "어제", createdAt: "" })).toBe("어제");
  });

  it("createdAt 이 파싱 불가면 time 라벨로 폴백", () => {
    expect(postTimeLabel({ time: "오래 전", createdAt: "not-a-date" })).toBe("오래 전");
  });

  // 핵심 계약: 러너 타임존과 무관하게 항상 KST(+09:00, DST 없음) 절대 시각을 낸다.
  // toLocaleString/Date.now 를 쓰면 SSR·hydration 불일치와 TZ 의존이 생기므로 이 문자열을 고정한다.
  it("UTC ISO 를 KST 절대 시각으로 변환(+9h)", () => {
    expect(postTimeLabel({ time: "x", createdAt: "2026-07-10T06:30:00Z" })).toBe("2026.7.10 15:30");
  });

  it("KST 로 넘기며 날짜가 하루 넘어가는 경계", () => {
    expect(postTimeLabel({ time: "x", createdAt: "2026-07-10T15:30:00Z" })).toBe("2026.7.11 00:30");
  });

  it("연·월·일이 모두 넘어가는 경계", () => {
    expect(postTimeLabel({ time: "x", createdAt: "2026-12-31T15:30:00Z" })).toBe("2027.1.1 00:30");
  });

  it("월·일은 0 패딩하지 않고 시·분만 0 패딩", () => {
    expect(postTimeLabel({ time: "x", createdAt: "2026-03-05T00:05:00Z" })).toBe("2026.3.5 09:05");
  });
});

describe("postCategoryLabel", () => {
  it("알려진 카테고리는 한글 라벨", () => {
    expect(postCategoryLabel("NOTICE")).toBe("공지");
    expect(postCategoryLabel("PRAYER")).toBe("기도요청");
    expect(postCategoryLabel("SERMON")).toBe("설교");
  });

  it("알 수 없는 값은 나눔으로 폴백", () => {
    expect(postCategoryLabel("UNKNOWN")).toBe("나눔");
  });
});

describe("postCategoryBadge", () => {
  it("알려진 카테고리는 이모지+라벨", () => {
    expect(postCategoryBadge("BULLETIN")).toEqual({ emoji: "📅", label: "주보" });
    expect(postCategoryBadge("PRAYER")).toEqual({ emoji: "🙏", label: "기도요청" });
  });

  it("알 수 없는 값은 나눔(SHARING) 배지로 폴백", () => {
    expect(postCategoryBadge("UNKNOWN")).toEqual({ emoji: "🌱", label: "나눔" });
  });
});
