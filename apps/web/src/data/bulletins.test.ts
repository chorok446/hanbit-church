import { describe, expect, it } from "vitest";
import { bulletinPdf, bulletinTitle, isPdfAttachment } from "./bulletins";
import type { Post } from "./posts";

function makePost(over: Partial<Post>): Post {
  return {
    id: "1",
    author: { name: "한빛교회", verified: true },
    time: "방금",
    text: "",
    tags: [],
    images: [],
    likes: 0,
    comments: 0,
    category: "BULLETIN",
    likedByMe: false,
    bookmarkedByMe: false,
    ownedByMe: false,
    ...over,
  };
}

describe("isPdfAttachment", () => {
  it("url 또는 name 확장자로 PDF 를 판별한다", () => {
    expect(isPdfAttachment({ name: "주보.pdf", url: "http://x/uploads/a.PDF" })).toBe(true);
    expect(isPdfAttachment({ name: "주보", url: "http://x/uploads/a.pdf" })).toBe(true);
    expect(isPdfAttachment({ name: "주보.hwp", url: "http://x/uploads/a.hwp" })).toBe(false);
  });
});

describe("bulletinPdf", () => {
  it("첫 PDF 첨부를 고르고, 비-PDF 는 건너뛴다", () => {
    const post = makePost({
      attachments: [
        { name: "안내.hwp", url: "http://x/uploads/a.hwp" },
        { name: "주보.pdf", url: "http://x/uploads/b.pdf" },
      ],
    });
    expect(bulletinPdf(post)?.url).toBe("http://x/uploads/b.pdf");
    expect(bulletinPdf(makePost({ attachments: [] }))).toBeNull();
  });
});

describe("bulletinTitle", () => {
  it("plain 본문 첫 줄을 제목으로 쓴다", () => {
    expect(bulletinTitle(makePost({ text: "7월 셋째 주 주보\n예배 순서 안내" }))).toBe("7월 셋째 주 주보");
  });
  it("HTML 본문은 태그를 걷어낸 첫 블록을 쓴다", () => {
    expect(bulletinTitle(makePost({ text: "<p>7월 넷째 주 주보</p><p>본문</p>" }))).toBe("7월 넷째 주 주보");
  });
  it("본문이 비면 기본값", () => {
    expect(bulletinTitle(makePost({ text: "  " }))).toBe("주보");
  });
});
