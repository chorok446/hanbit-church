import { describe, expect, it } from "vitest";
import { maskIp, maskPhone } from "./mask";

describe("maskPhone", () => {
  it("하이픈 포함 휴대폰 번호의 끝 4자리를 가린다", () => {
    expect(maskPhone("010-1234-5678")).toBe("010-1234-****");
  });

  it("숫자만 있는 번호도 3-중간-4 형태로 재조립한다", () => {
    expect(maskPhone("01012345678")).toBe("010-1234-****");
  });

  it("지역번호(9~10자리)도 끝 4자리를 가린다", () => {
    expect(maskPhone("051-123-4567")).toBe("051-123-****");
  });

  it("짧은 번호는 끝 4자리만, 아주 짧으면 전체를 가린다", () => {
    expect(maskPhone("12345678")).toBe("1234****");
    expect(maskPhone("123")).toBe("****");
  });
});

describe("maskIp", () => {
  it("IPv4 마지막 옥텟을 가린다", () => {
    expect(maskIp("203.0.113.42")).toBe("203.0.113.*");
  });

  it("IPv4 형식이 아니면 뒤쪽 절반을 가린다", () => {
    expect(maskIp("::1")).toBe("::*");
  });
});
