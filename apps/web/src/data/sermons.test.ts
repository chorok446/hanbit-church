import { describe, expect, it } from "vitest";
import { CHURCH } from "./church";
import type { Post } from "./posts";
import {
  buildSermonBody,
  getSermonSections,
  isParsableScripture,
  parseSermonInfo,
  sermonPreacherLabel,
  stripYouTubeUrls,
  youTubeWatchUrl,
} from "./sermons";

function post(text: string, overrides: Partial<Post> = {}): Post {
  return {
    id: "p1",
    author: { name: "홍길동", verified: false },
    time: "2026-07-12",
    text,
    tags: [],
    images: [],
    likes: 0,
    comments: 0,
    category: "SERMON",
    likedByMe: false,
    bookmarkedByMe: false,
    ownedByMe: false,
    ...overrides,
  };
}

describe("stripYouTubeUrls", () => {
  it("라벨이 붙은 유튜브 URL 을 라벨째 제거한다", () => {
    expect(stripYouTubeUrls("말씀 요약\n다시듣기: https://youtu.be/dQw4w9WgXcQ")).toBe("말씀 요약");
  });
  it("앵커 태그를 제거한다", () => {
    const html = '본문 <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">영상</a> 끝';
    expect(stripYouTubeUrls(html)).toBe("본문 끝"); // 앵커 제거 후 이중 공백은 하나로 정리
  });
  it("연속 공백을 하나로 줄이고 trim 한다", () => {
    expect(stripYouTubeUrls("a    b   ")).toBe("a b");
  });
  it("유튜브가 없으면 그대로(공백 정리만)", () => {
    expect(stripYouTubeUrls("평범한 본문입니다.")).toBe("평범한 본문입니다.");
  });
});

describe("isParsableScripture", () => {
  it("파서와 왕복 가능한 표기는 true", () => {
    expect(isParsableScripture("데살로니가전서 5:16-18")).toBe(true);
    expect(isParsableScripture("시편 23편")).toBe(true);
    expect(isParsableScripture("요한복음 3:16")).toBe(true);
  });
  it("파싱 불가한 표기는 false", () => {
    expect(isParsableScripture("아무 말")).toBe(false);
    expect(isParsableScripture("")).toBe(false);
  });
});

describe("youTubeWatchUrl", () => {
  it("videoId 로 watch URL 을 만든다", () => {
    expect(youTubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});

describe("sermonPreacherLabel", () => {
  it("교회 계정이 아니면 작성자 이름 그대로", () => {
    expect(sermonPreacherLabel("김성도")).toBe("김성도");
  });
  it("교회 공식 계정이면 담임목사로 표기", () => {
    expect(sermonPreacherLabel(CHURCH.name)).toMatch(/^담임목사/);
  });
});

describe("parseSermonInfo — 제목 패턴", () => {
  it("「…」 겹낫표 제목", () => {
    const info = parseSermonInfo(post("「빛으로 오신 주」 (요한복음 1:14) 성탄의 은혜."));
    expect(info.title).toBe("빛으로 오신 주");
    expect(info.scripture).toBe("요한복음 1:14");
  });
  it("— \"…\" 대시+따옴표 제목", () => {
    const info = parseSermonInfo(post('주일 설교 — "은혜의 강" (시편 23:1-3).'));
    expect(info.title).toBe("은혜의 강");
    expect(info.scripture).toBe("시편 23:1-3");
  });
  it("패턴이 없으면 본문 앞부분을 60자로 잘라 제목 폴백(요약 비움)", () => {
    const long =
      "하나님의 사랑에 대하여 함께 묵상하며 은혜를 나누는 귀한 시간을 가진 오늘 우리 모두가 큰 위로를 경험한 하루였습니다";
    const info = parseSermonInfo(post(long));
    expect(info.title.endsWith("…")).toBe(true);
    expect(info.title.length).toBeLessThanOrEqual(61); // 최대 60자 + 말줄임표
    expect(info.title.length).toBeGreaterThan(1);
    expect(info.scripture).toBeNull();
    expect(info.summary).toBe("");
  });
});

describe("parseSermonInfo — 예배 구분(태그)", () => {
  const cases: [string[], string][] = [
    [[], "SUNDAY"],
    [["#수요예배"], "WEDNESDAY"],
    [["#새벽기도"], "DAWN"],
    [["#특별집회"], "SPECIAL"],
    [["#특새"], "SPECIAL"],
  ];
  it.each(cases)("태그 %j → %s", (tags, expected) => {
    const info = parseSermonInfo(post('— "제목" (시편 1:1).', { tags }));
    expect(info.serviceType).toBe(expected);
  });
});

describe("getSermonSections — 목록 파싱과 샘플 폴백", () => {
  it("본문에 나눔 질문/기도 제목 목록이 있으면 추출한다", () => {
    const text = [
      '— "말씀" (시편 1:1).',
      "",
      "요약 문장.",
      "",
      "나눔 질문",
      "1. 첫째 질문",
      "2. 둘째 질문",
      "",
      "기도 제목",
      "- 첫째 기도",
    ].join("\n");
    const p = post(text);
    const sections = getSermonSections(p, parseSermonInfo(p));
    expect(sections.questions).toEqual({ items: ["첫째 질문", "둘째 질문"], sample: false });
    expect(sections.prayers).toEqual({ items: ["첫째 기도"], sample: false });
    expect(sections.summary.sample).toBe(false);
  });
  it("목록·요약이 없으면 샘플로 폴백한다", () => {
    const longNoPattern =
      "하나님의 사랑에 대하여 함께 묵상하며 은혜를 나누는 귀한 시간을 가진 오늘 우리 모두가 큰 위로를 경험한 하루였습니다";
    const p = post(longNoPattern);
    const sections = getSermonSections(p, parseSermonInfo(p));
    expect(sections.questions.sample).toBe(true);
    expect(sections.prayers.sample).toBe(true);
    expect(sections.summary.sample).toBe(true);
  });
});

describe("buildSermonBody ↔ parseSermonInfo/getSermonSections 왕복 호환", () => {
  it("plain 요약 본문을 조립하면 파서가 제목·본문·목록·영상을 복원한다", () => {
    const body = buildSermonBody({
      title: "은혜의 강",
      scripture: "시편 23:1-3",
      serviceType: "SUNDAY",
      youtubeUrl: "https://youtu.be/dQw4w9WgXcQ",
      summary: "말씀 요약 문장입니다.",
      questions: ["첫째 질문", "둘째 질문"],
      prayers: ["첫째 기도"],
    });
    const p = post(body);
    const info = parseSermonInfo(p);
    expect(info.title).toBe("은혜의 강");
    expect(info.scripture).toBe("시편 23:1-3");
    expect(info.serviceType).toBe("SUNDAY");
    expect(info.youtubeId).toBe("dQw4w9WgXcQ");
    expect(info.summary).toBe("말씀 요약 문장입니다.");

    const sections = getSermonSections(p, info);
    expect(sections.questions.items).toEqual(["첫째 질문", "둘째 질문"]);
    expect(sections.prayers.items).toEqual(["첫째 기도"]);
    expect(sections.summary.sample).toBe(false);
  });
});
