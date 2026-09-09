import { describe, expect, it } from "vitest";
import { isInternalHref } from "./internal-href";

describe("내부 이동 주소 정책", () => {
  it.each([
    null, undefined, "", "feed", "?tab=account", "#section",
    "https://internal.invalid/feed", "//internal.invalid/feed",
    "//redirect.invalid", "///redirect.invalid", "/\\redirect.invalid",
    "/\t/redirect.invalid", "/\r/redirect.invalid", "/\n/redirect.invalid",
    " /feed", "/feed ", "/feed\u0000", "/feed\u007f",
    "/safe/..//redirect.invalid", "/%2e%2e//redirect.invalid",
  ])("허용되지 않는 주소 %j 를 거부한다", (href) => {
    expect(isInternalHref(href)).toBe(false);
  });

  it.each([
    "/", "/feed", "/cell-groups/1?tab=members#list", "/feed?q=은혜",
    "/feed?q=https%3A%2F%2Fexample.com", "/feed?q=//example.com",
    "/feed?q=%2F%5C%0A", "/feed#//example.com", "/소식/주보",
    "/posts/../feed", "/feed?q=hello%20world",
  ])("정상 루트 상대 주소 %j 를 허용한다", (href) => {
    expect(isInternalHref(href)).toBe(true);
  });
});
