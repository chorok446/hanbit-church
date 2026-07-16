import { describe, expect, it } from "vitest";
import {
  isAdminOnlyCategory,
  isStaffWriteCategory,
  isValidPostImageUrl,
  normalizePostImages,
  normalizePostTags,
  postCategoryBadge,
  postCategoryLabel,
} from "./posts";

// 서버 PostCategory 열거와 1:1 동기화되는 계약을 프론트에서 고정한다(CLAUDE.md: keep both in sync).
describe("카테고리 권한 계약", () => {
  it("공식 채널(공지·주보)만 admin-only", () => {
    expect(isAdminOnlyCategory("NOTICE")).toBe(true);
    expect(isAdminOnlyCategory("BULLETIN")).toBe(true);
    expect(isAdminOnlyCategory("SERMON")).toBe(false);
    expect(isAdminOnlyCategory("SHARING")).toBe(false);
    expect(isAdminOnlyCategory("PRAYER")).toBe(false);
  });

  it("스태프 작성 채널은 공지·주보·설교 — SERMON 은 staff-write 지만 admin-only 는 아님(비대칭)", () => {
    expect(isStaffWriteCategory("NOTICE")).toBe(true);
    expect(isStaffWriteCategory("BULLETIN")).toBe(true);
    expect(isStaffWriteCategory("SERMON")).toBe(true);
    expect(isStaffWriteCategory("SHARING")).toBe(false);
    expect(isStaffWriteCategory("PRAYER")).toBe(false);
    // 비대칭 명시: SERMON 은 스태프가 쓰지만 admin-only 채널은 아니다.
    expect(isStaffWriteCategory("SERMON")).toBe(true);
    expect(isAdminOnlyCategory("SERMON")).toBe(false);
  });

  it("알 수 없는 값은 어느 쪽도 아님", () => {
    expect(isAdminOnlyCategory("UNKNOWN")).toBe(false);
    expect(isStaffWriteCategory("")).toBe(false);
  });
});

describe("postCategoryLabel / postCategoryBadge", () => {
  it("정상 카테고리 라벨", () => {
    expect(postCategoryLabel("NOTICE")).toBe("공지");
    expect(postCategoryLabel("PRAYER")).toBe("기도요청");
  });
  it("알 수 없는 카테고리는 '나눔' 으로 폴백", () => {
    expect(postCategoryLabel("BOGUS")).toBe("나눔");
  });
  it("배지는 이모지+라벨, 알 수 없으면 SHARING 폴백", () => {
    expect(postCategoryBadge("SERMON")).toEqual({ emoji: "📖", label: "설교" });
    expect(postCategoryBadge("BOGUS")).toEqual({ emoji: "🌱", label: "나눔" });
  });
});

describe("isValidPostImageUrl", () => {
  it("https 와 로컬 http 만 허용(추적 픽셀 방어)", () => {
    expect(isValidPostImageUrl("https://cdn/x.jpg")).toBe(true);
    expect(isValidPostImageUrl("  http://localhost:8080/uploads/x.jpg  ")).toBe(true); // trim 후 판정
    expect(isValidPostImageUrl("HTTPS://cdn/x.jpg")).toBe(true); // 대문자 스킴도 동일 판정
    expect(isValidPostImageUrl("http://LOCALHOST:8080/x.jpg")).toBe(true); // 대문자 호스트도 로컬 예외(백엔드와 정합)
    expect(isValidPostImageUrl("http://cdn/x.jpg")).toBe(false); // 외부 http 는 차단
    expect(isValidPostImageUrl("ftp://x")).toBe(false);
    expect(isValidPostImageUrl("/local/x.jpg")).toBe(false);
    expect(isValidPostImageUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("normalizePostTags", () => {
  it("trim·빈값 제거 후 '#' 접두사를 붙인다", () => {
    expect(normalizePostTags(["  react  ", "vue"])).toEqual(["#react", "#vue"]);
    expect(normalizePostTags(["", "   ", "kotlin"])).toEqual(["#kotlin"]);
  });
  it("이미 '#' 이 있으면 그대로, 접두사 유무만 다른 값은 중복 제거", () => {
    expect(normalizePostTags(["#react", "react"])).toEqual(["#react"]);
    expect(normalizePostTags(["spring", "#spring", " spring "])).toEqual(["#spring"]);
  });
  it("첫 등장 순서를 보존한다", () => {
    expect(normalizePostTags(["b", "a", "b"])).toEqual(["#b", "#a"]);
  });
  it("대소문자는 다른 태그로 취급", () => {
    expect(normalizePostTags(["#React", "react"])).toEqual(["#React", "#react"]);
  });
});

describe("normalizePostImages", () => {
  it("trim·빈값 제거·중복 제거(첫 등장 순서 유지)", () => {
    expect(normalizePostImages(["  a  ", "b", "a", ""])).toEqual(["a", "b"]);
  });
});
