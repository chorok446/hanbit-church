import { describe, expect, it } from "vitest";
import { unsplashSrcSet } from "./unsplash-srcset";

describe("unsplashSrcSet", () => {
  it("unsplash CDN URL 은 폭 3종(400/700/1000) 후보를 만든다", () => {
    const result = unsplashSrcSet("https://images.unsplash.com/photo-abc?w=1200&q=80");
    expect(result).toBeDefined();
    const entries = result!.split(", ");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toContain("w=400");
    expect(entries[0].endsWith(" 400w")).toBe(true);
    expect(entries[2]).toContain("w=1000");
    // 나머지 쿼리(q=80)는 유지된다.
    expect(entries[1]).toContain("q=80");
  });

  it("unsplash 가 아니거나 w 파라미터가 없으면 손대지 않는다", () => {
    expect(unsplashSrcSet("https://images.unsplash.com/photo-abc")).toBeUndefined();
    expect(unsplashSrcSet("https://example.com/a.jpg?w=1200")).toBeUndefined();
    expect(unsplashSrcSet("http://localhost:8080/uploads/x.jpg")).toBeUndefined();
  });

  it("URL 이 아닌 입력은 undefined", () => {
    expect(unsplashSrcSet("not-a-url")).toBeUndefined();
    expect(unsplashSrcSet("")).toBeUndefined();
  });
});
