import { describe, expect, it } from "vitest";
import { eventJsonLd, postJsonLd, serializeJsonLd } from "./json-ld";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";

const basePost: Post = {
  id: "p1",
  author: { name: "김성도", verified: true },
  time: "2시간 전",
  text: "<p>주일 예배 나눔</p>",
  tags: ["#나눔"],
  images: ["https://example.com/a.jpg"],
  likes: 3,
  comments: 2,
  category: "SHARING",
  likedByMe: false,
  bookmarkedByMe: false,
  ownedByMe: false,
  createdAt: "2026-07-01T00:00:00Z",
};

const baseEvent: Event = {
  id: "c1",
  status: "open",
  title: "여름 수련회",
  summary: "말씀과 기도로 함께",
  thumb: "https://example.com/t.jpg",
  recruitStart: "2026-07-01",
  recruitEnd: "2026-07-31",
  runStart: "2026-08-05",
  runEnd: "2026-08-30",
  capacity: 10,
  joined: 3,
  daysLeftLabel: "모집중",
  recruitable: true,
  recruitState: "recruiting",
  author: { name: "개설자", verified: false },
  body: { heading: "소개", paragraphs: [], images: [] },
  joinedByMe: false,
  bookmarkedByMe: false,
  ownedByMe: false,
  place: "본당",
};

describe("serializeJsonLd", () => {
  it("</script> 조기 종료를 막도록 < 를 이스케이프한다", () => {
    const out = serializeJsonLd({ text: "</script><img onerror=x>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script>");
  });
});

describe("postJsonLd", () => {
  it("SocialMediaPosting 스키마에 본문·작성자·상호작용 수를 담는다", () => {
    const ld = postJsonLd(basePost) as Record<string, unknown>;
    expect(ld["@type"]).toBe("SocialMediaPosting");
    expect(ld.headline).toBe("주일 예배 나눔");
    expect(ld.datePublished).toBe("2026-07-01T00:00:00Z");
    expect((ld.author as { name: string }).name).toBe("김성도");
  });

  it("시드 글(createdAt 없음)은 datePublished 를 생략한다", () => {
    const ld = postJsonLd({ ...basePost, createdAt: undefined }) as Record<string, unknown>;
    expect("datePublished" in ld).toBe(false);
  });
});

describe("eventJsonLd", () => {
  it("Event 스키마에 기간·정원·장소를 담는다", () => {
    const ld = eventJsonLd(baseEvent) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Event");
    expect(ld.startDate).toBe("2026-08-05");
    expect(ld.maximumAttendeeCapacity).toBe(10);
    expect((ld.location as { name: string }).name).toBe("본당");
  });

  it("장소가 없으면 location 을 생략한다", () => {
    const ld = eventJsonLd({ ...baseEvent, place: null }) as Record<string, unknown>;
    expect("location" in ld).toBe(false);
  });
});
