import { describe, expect, it } from "vitest";
import { getPasswordPolicyState, isValidEmail, normalizeEmail } from "./auth";

// 클라이언트 이메일·비밀번호 검증 헬퍼 계약 고정.
// 비밀번호 정책은 서버와 동일해야 한다(8~15자 + 영문 + 숫자 + 특수문자).

describe("normalizeEmail", () => {
  it("앞뒤 공백 제거 + 소문자화", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("이미 정규화된 값은 그대로", () => {
    expect(normalizeEmail("already@lower.com")).toBe("already@lower.com");
  });
});

describe("isValidEmail", () => {
  it("정상 이메일", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("user.name@example.com")).toBe(true);
    // 정규화 후 판정하므로 대문자·앞뒤 공백도 유효로 본다.
    expect(isValidEmail("  USER@EXAMPLE.COM ")).toBe(true);
  });

  it("@ 없음·도메인 점 없음·빈 로컬·공백은 무효", () => {
    expect(isValidEmail("no-at-sign")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail("@nodomain.com")).toBe(false);
    expect(isValidEmail("spaces in@email.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("getPasswordPolicyState", () => {
  it("8~15자 + 영문 + 숫자 + 특수문자면 valid", () => {
    expect(getPasswordPolicyState("Abcd123!")).toEqual({
      hasLetter: true,
      hasNumber: true,
      hasSpecial: true,
      lengthValid: true,
      valid: true,
    });
  });

  it("길이 경계: 7자 무효, 8자·15자 유효, 16자 무효", () => {
    expect(getPasswordPolicyState("Abc123!").lengthValid).toBe(false); // 7자
    expect(getPasswordPolicyState("Abcd123!").lengthValid).toBe(true); // 8자
    expect(getPasswordPolicyState("Abcdef123456!@#").lengthValid).toBe(true); // 15자
    expect(getPasswordPolicyState("Abcdef123456!@#$").lengthValid).toBe(false); // 16자
  });

  it("영문 누락이면 valid=false", () => {
    const s = getPasswordPolicyState("12345678!");
    expect(s.hasLetter).toBe(false);
    expect(s.valid).toBe(false);
  });

  it("숫자 누락이면 valid=false", () => {
    const s = getPasswordPolicyState("Abcdefg!");
    expect(s.hasNumber).toBe(false);
    expect(s.valid).toBe(false);
  });

  it("특수문자 누락이면 valid=false", () => {
    const s = getPasswordPolicyState("Abcd1234");
    expect(s.hasSpecial).toBe(false);
    expect(s.valid).toBe(false);
  });
});
