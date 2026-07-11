import { describe, expect, it } from "vitest";
import { progressPercent } from "./progress";

describe("progressPercent", () => {
  it("정상 범위에서 0~100 정수 퍼센트를 반환한다", () => {
    expect(progressPercent(0, 10)).toBe(0);
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(10, 10)).toBe(100);
    expect(progressPercent(1, 3)).toBe(33); // 반올림
  });

  it("정원이 0 이하면 0 을 반환한다(0 나눗셈·비정상 데이터 방어)", () => {
    expect(progressPercent(5, 0)).toBe(0);
    expect(progressPercent(5, -1)).toBe(0);
  });

  it("범위를 벗어난 참여 수는 0~100 으로 clamp 한다", () => {
    expect(progressPercent(20, 10)).toBe(100); // 초과 신청
    expect(progressPercent(-5, 10)).toBe(0); // 음수
  });

  it("NaN·Infinity 입력은 0 을 반환한다(항상 finite)", () => {
    expect(progressPercent(NaN, 10)).toBe(0);
    expect(progressPercent(5, NaN)).toBe(0);
    expect(progressPercent(Infinity, 10)).toBe(0);
    expect(progressPercent(5, Infinity)).toBe(0);
  });
});
