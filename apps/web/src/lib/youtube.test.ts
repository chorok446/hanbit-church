import { describe, expect, it } from "vitest";
import { extractYouTubeId, youTubeEmbedUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("watch·youtu.be·shorts·embed·live 형태에서 id를 찾는다", () => {
    expect(extractYouTubeId("다시듣기: https://www.youtube.com/watch?v=dQw4w9WgXcQ 요약")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeId("https://www.youtube.com/live/dQw4w9WgXcQ?feature=share")).toBe("dQw4w9WgXcQ");
  });

  it("추가 쿼리 파라미터가 있어도 v= 값을 찾는다", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=10s")).toBe("dQw4w9WgXcQ");
  });

  it("리치 HTML 링크 안에서도 찾는다", () => {
    expect(
      extractYouTubeId('<p>다시듣기: <a href="https://youtu.be/dQw4w9WgXcQ">영상</a></p>'),
    ).toBe("dQw4w9WgXcQ");
  });

  it("유튜브 링크가 없으면 null", () => {
    expect(extractYouTubeId("일반 텍스트 https://example.com/watch?v=abc")).toBeNull();
    expect(extractYouTubeId("")).toBeNull();
  });

  it("임베드 URL은 nocookie 도메인을 쓴다", () => {
    expect(youTubeEmbedUrl("dQw4w9WgXcQ")).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });
});
