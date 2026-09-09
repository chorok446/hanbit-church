import { describe, expect, it } from "vitest";
import { isNotificationNavigable } from "./notifications";

describe("알림 내부 링크 검증", () => {
  it.each([
    "", "/", "#", "https://redirect.invalid", "javascript:alert(1)",
    "//redirect.invalid", "/\\redirect.invalid", "/\t/redirect.invalid",
    " //redirect.invalid", " /notifications", "/notifications ",
    "/safe/..//redirect.invalid", "/%2e%2e//redirect.invalid",
  ])("빈 목적지나 외부 이동 위험이 있는 %j 는 링크로 사용하지 않는다", (href) => {
    expect(isNotificationNavigable(href)).toBe(false);
  });

  it.each(["/notifications", "/posts/1#comments", "/mypage?tab=security"])(
    "정상 내부 목적지 %j 는 허용한다",
    (href) => expect(isNotificationNavigable(href)).toBe(true),
  );
});
