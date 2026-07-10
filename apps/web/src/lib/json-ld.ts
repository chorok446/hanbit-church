import { getSiteUrl } from "@/lib/site-url";
import { richTextPlainPreview } from "@/lib/rich-text-length";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";

/**
 * JSON-LD 직렬화. `</script>` 조기 종료·태그 주입을 막기 위해 `<` 를 유니코드 이스케이프한다
 * (본문·작성자명은 사용자 입력이므로 그대로 직렬화하면 안 된다).
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** 게시글 상세용 SocialMediaPosting 스키마. 시드 글은 createdAt 이 없어 datePublished 를 생략한다.
 * 익명 기도제목은 서버가 author 를 이미 마스킹("익명")해 내려주므로 그대로 직렬화해도 안전하다. */
export function postJsonLd(post: Post): object {
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: richTextPlainPreview(post.text, 110),
    text: richTextPlainPreview(post.text, 500),
    url: `${getSiteUrl()}/posts/${encodeURIComponent(post.id)}`,
    ...(post.createdAt ? { datePublished: post.createdAt } : {}),
    ...(post.images.length > 0 ? { image: post.images } : {}),
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likes,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: post.comments,
      },
    ],
  };
}

/** 행사 상세용 Event 스키마. 날짜는 백엔드가 YYYY-MM-DD 로 내려준다. */
export function eventJsonLd(event: Event): object {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    url: `${getSiteUrl()}/events/${encodeURIComponent(event.id)}`,
    startDate: event.runStart,
    endDate: event.runEnd,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    // closed 는 "모집 종료"지 행사 취소가 아니므로 상태는 Scheduled 로 둔다.
    eventStatus: "https://schema.org/EventScheduled",
    ...(event.thumb ? { image: [event.thumb] } : {}),
    // 실무 안내의 장소가 있으면 리치 스니펫에 함께 노출한다.
    ...(event.place ? { location: { "@type": "Place", name: event.place } } : {}),
    organizer: {
      "@type": "Person",
      name: event.author.name,
    },
    ...(event.capacity > 0 ? { maximumAttendeeCapacity: event.capacity } : {}),
  };
}
