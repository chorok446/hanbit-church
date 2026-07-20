import type { Post, PostAttachment } from "@/data/posts";

/**
 * 주보 화면 전용 파싱 계층. 주보는 PDF 첨부 + 짧은 본문 구조라 설교(sermons.ts) 같은
 * 무거운 정규식 파서가 필요 없다 — 첨부에서 PDF 를 고르고, 본문 첫 줄을 제목으로 쓴다.
 * SSR·클라이언트 목록 양쪽에서 동일 문자열을 내야 하므로 DOMParser 없이 정규식만 쓴다.
 */

/** 첨부가 PDF 인지 — url/name 확장자로 판별한다(서버 PostAttachment 에 타입 필드가 없다). */
export function isPdfAttachment(att: PostAttachment): boolean {
  return /\.pdf$/i.test(att.url) || /\.pdf$/i.test(att.name ?? "");
}

/** 주보 게시글의 PDF 첨부만 추린다(대개 1개, 최대 3개). */
export function bulletinPdfAttachments(post: Post): PostAttachment[] {
  return (post.attachments ?? []).filter(isPdfAttachment);
}

/** 첫 번째 PDF 첨부(대표 주보). 없으면 null. */
export function bulletinPdf(post: Post): PostAttachment | null {
  return bulletinPdfAttachments(post)[0] ?? null;
}

/**
 * 본문 첫 줄/첫 블록을 목록·상세 제목으로 쓴다(공지·주보 작성 폼 안내와 동일 관례).
 * HTML 본문은 태그를 걷어낸 첫 블록, plain 본문은 첫 줄. 비면 "주보".
 */
export function bulletinTitle(post: Post): string {
  const text = post.text.trim();
  const plain = /<[a-z][\s\S]*>/i.test(text)
    ? text
        .replace(/<\/(?:p|li|ul|ol|div|h[1-6]|br)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    : text.replace(/\*\*([^*]+)\*\*/g, "$1");
  const first = plain
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return first || "주보";
}
