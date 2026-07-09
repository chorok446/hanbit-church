import { describe, expect, it } from "vitest";
import {
  cleanEmptyRichParagraphs,
  mergeRichBodyForEditor,
  splitRichBodyHtml,
} from "@/lib/rich-body-html";

describe("rich-body-html", () => {
  it("split 은 img src 를 분리한다", () => {
    const { html, images } = splitRichBodyHtml(
      '<p>소개</p><p><img src="https://a.com/1.jpg" alt="" /></p>',
    );
    expect(html).toBe("<p>소개</p>");
    expect(images).toEqual(["https://a.com/1.jpg"]);
  });

  it("merge 는 그리드 이미지를 편집 HTML 로 되돌린다", () => {
    const merged = mergeRichBodyForEditor("<p>소개</p>", ["https://a.com/1.jpg"]);
    expect(merged).toContain("https://a.com/1.jpg");
    expect(merged).toContain("소개");
  });

  it("merge 는 src 의 특수문자를 이스케이프해 라운드트립한다", () => {
    const url = "https://a.com/1.jpg?a=1&b=2\"><script>";
    const merged = mergeRichBodyForEditor("", [url]);
    expect(merged).not.toContain('"><script>');
    expect(merged).toContain("&amp;");
    // 편집 HTML 을 다시 분리하면 원래 URL 로 복원된다
    const { images } = splitRichBodyHtml(merged);
    expect(images).toEqual([url]);
  });

  it("cleanEmptyRichParagraphs 는 빈 p 를 제거한다", () => {
    expect(cleanEmptyRichParagraphs("<p>본문</p><p></p><p>&nbsp;</p>")).toBe("<p>본문</p>");
  });
});
