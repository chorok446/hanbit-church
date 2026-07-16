import { richTextPlainLength } from "@/lib/rich-text-length";
import { mergeRichBodyForEditor, splitRichBodyHtml } from "@/lib/rich-body-html";
import { isAllowedImageUrl } from "@/lib/image-url";
import { apiGet, apiPatch, apiPut } from "@/lib/api";
import type { CommentPageLocationResponse } from "@/data/comments";

/** 백엔드 PostValidators 와 동일한 제한. */
export const POST_MAX_TEXT_LENGTH = 1000;
export const POST_MAX_TAGS = 10;
export const POST_MAX_TAG_LENGTH = 30;
export const POST_MAX_IMAGES = 4;

export type PostComposeValues = {
  text: string;
  images: string[];
  tags: string[];
  event: string;
};

export type PostComposePayload = {
  text: string;
  images: string[];
  tags: string[];
  eventId: string | null;
};

/** 서버 PostCategory 와 동일한 값. */
export type PostCategory = "NOTICE" | "BULLETIN" | "SERMON" | "SHARING" | "PRAYER";

export const POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "SHARING", label: "나눔" },
  { value: "PRAYER", label: "기도요청" },
  { value: "NOTICE", label: "공지" },
  { value: "BULLETIN", label: "주보" },
  { value: "SERMON", label: "설교" },
];

/** 서버 PostCategory.ADMIN_ONLY 와 동일 — 교회 공식 소식(좋아요·신고 비노출). */
export const POST_ADMIN_CATEGORIES: PostCategory[] = ["NOTICE", "BULLETIN"];

export function isAdminOnlyCategory(category: string): boolean {
  return POST_ADMIN_CATEGORIES.includes(category as PostCategory);
}

/**
 * 서버 PostCategory.STAFF_WRITE 와 1:1 — 스태프(최고 관리자·운영자·콘텐츠 관리자,
 * getAdminPermissions().canManageContent)만 작성·수정 가능(서버 403). 비스태프에게는
 * 작성·수정 화면에서 선택지 자체를 숨긴다. 파일 첨부(주보 PDF·설교 자료 등)도 이 기준으로
 * 허용된다(서버 normalizeAttachments 와 동일).
 */
export const POST_STAFF_WRITE_CATEGORIES: PostCategory[] = ["NOTICE", "BULLETIN", "SERMON"];

export function isStaffWriteCategory(category: string): boolean {
  return POST_STAFF_WRITE_CATEGORIES.includes(category as PostCategory);
}

/** 게시글 첨부파일(주보 PDF 등). 서버 PostAttachment 와 1:1. */
export type PostAttachment = { name: string; url: string; size?: number | null };

/** 서버 PostValidators.MAX_ATTACHMENTS 와 동일. */
export const POST_MAX_ATTACHMENTS = 3;

export function postCategoryLabel(category: string): string {
  return POST_CATEGORIES.find((item) => item.value === category)?.label ?? "나눔";
}

/** 교회 특화 카테고리 배지(이모지 + 라벨). 카드·게시판 리스트의 카테고리 pill 에서 공용. */
const POST_CATEGORY_BADGES: Record<PostCategory, { emoji: string; label: string }> = {
  NOTICE: { emoji: "📢", label: "공지" },
  BULLETIN: { emoji: "📅", label: "주보" },
  SERMON: { emoji: "📖", label: "설교" },
  PRAYER: { emoji: "🙏", label: "기도요청" },
  SHARING: { emoji: "🌱", label: "나눔" },
};

export function postCategoryBadge(category: string): { emoji: string; label: string } {
  return POST_CATEGORY_BADGES[category as PostCategory] ?? POST_CATEGORY_BADGES.SHARING;
}

export type PostComposeField = "text" | "images" | "tags";

export type PostComposeValidationResult =
  | { ok: true; payload: PostComposePayload }
  | { ok: false; message: string; field?: PostComposeField };

export function isValidPostImageUrl(url: string): boolean {
  return isAllowedImageUrl(url);
}

export function normalizePostTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)),
    ),
  );
}

export function normalizePostImages(images: string[]): string[] {
  return Array.from(new Set(images.map((url) => url.trim()).filter(Boolean)));
}

export function validatePostCompose(values: PostComposeValues): PostComposeValidationResult {
  const { html, images: inlineImages } = splitRichBodyHtml(values.text.trim());
  const plainLength = richTextPlainLength(html);
  if (plainLength === 0 && values.images.length === 0 && inlineImages.length === 0) {
    return { ok: false, message: "내용을 입력해주세요.", field: "text" };
  }
  if (plainLength > POST_MAX_TEXT_LENGTH) {
    return {
      ok: false,
      message: `내용은 ${POST_MAX_TEXT_LENGTH}자 이하여야 합니다.`,
      field: "text",
    };
  }

  const tags = normalizePostTags(values.tags);
  if (tags.length > POST_MAX_TAGS) {
    return {
      ok: false,
      message: `태그는 최대 ${POST_MAX_TAGS}개까지 가능합니다.`,
      field: "tags",
    };
  }
  if (tags.some((tag) => tag.length > POST_MAX_TAG_LENGTH)) {
    return {
      ok: false,
      message: `태그는 ${POST_MAX_TAG_LENGTH}자 이하여야 합니다.`,
      field: "tags",
    };
  }

  const images = normalizePostImages([...values.images, ...inlineImages]);
  if (images.length > POST_MAX_IMAGES) {
    return {
      ok: false,
      message: `이미지는 최대 ${POST_MAX_IMAGES}개까지 가능합니다.`,
      field: "images",
    };
  }
  if (images.some((url) => !isValidPostImageUrl(url))) {
    return {
      ok: false,
      message: "이미지 URL은 http:// 또는 https:// 로 시작해야 합니다.",
      field: "images",
    };
  }

  return {
    ok: true,
    payload: {
      text: html,
      images,
      tags,
      eventId: values.event.trim() || null,
    },
  };
}

export function postToComposeValues(post: Post): PostComposeValues {
  return {
    text: mergeRichBodyForEditor(post.text, post.images),
    images: [],
    tags: post.tags,
    event: post.eventId ?? "",
  };
}

export type PostSearchSort = "latest" | "popular" | "discussed" | "relevance";

export type Post = {
  id: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  authorId?: number | null;
  time: string;
  text: string;
  tags: string[];
  images: string[];
  likes: number;
  comments: number;
  eventId?: string;
  category: PostCategory;
  /** 공지·주보 첨부파일(PDF 등). 이전 응답 캐시 호환을 위해 optional. */
  attachments?: PostAttachment[];
  /** 조회수. 상세 조회마다 증가. 이전 응답 호환을 위해 optional. */
  views?: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  ownedByMe: boolean;
  /** 관리자 숨김 여부. 작성자 본인 경로(mine/상세)에서만 true 로 내려온다. */
  hidden?: boolean;
  /** 작성 시각(ISO). 시드 게시글·이전 응답 캐시는 null/undefined. */
  createdAt?: string | null;
  /** 익명 기도제목 여부. true 면 author/authorId 가 서버에서 마스킹된 값이다. */
  anonymous?: boolean;
  /** 공개 범위. MEMBERS = 로그인 교인만 열람(기도 전용). 이전 응답 호환을 위해 optional. */
  visibility?: "PUBLIC" | "MEMBERS";
  /** 공지·주보 상단 고정 여부(서버 pinnedAt 기준). */
  pinned?: boolean;
  /** 예약 게시 시각(ISO) — 예약 글 작성자·관리자 확인용. */
  publishAt?: string | null;
  /** 본문 수정 여부 — 상세에서 '수정됨' 표시(댓글과 동일 의미). */
  edited?: boolean;
};

/**
 * 게시글 시각 표기. createdAt 이 있으면 KST 절대 시각("2026.7.10 15:30"), 없으면(시드)
 * 저장된 time 라벨을 그대로 쓴다. SSR 상세와 클라이언트 hydration 이 같은 문자열을 내도록
 * Date.now()·로케일 API 없이 고정 +09:00 오프셋(KST 는 DST 없음)으로 계산한다.
 */
export function postTimeLabel(post: Pick<Post, "createdAt" | "time">): string {
  if (!post.createdAt) return post.time;
  const epoch = new Date(post.createdAt).getTime();
  if (Number.isNaN(epoch)) return post.time;
  const kst = new Date(epoch + 9 * 3_600_000);
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${kst.getUTCFullYear()}.${kst.getUTCMonth() + 1}.${kst.getUTCDate()} ${hh}:${mm}`;
}

export type PostSearchResponse = {
  content: Post[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 마이페이지 게시글 pagination 응답(내 글/저장됨). 백엔드 PostPageResponse 와 1:1.
export type PostPageResponse = {
  content: Post[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// 목록 페이지 크기 — 서버 컴포넌트(ISR 선주입)와 클라이언트 목록이 같은 값을 써야 한다.
// "use client" 모듈에서 export 하면 서버에서 클라이언트 참조 프록시가 되므로 여기(서버 안전)서 정의한다.
export const SERMON_PAGE_SIZE = 10;
export const NEWS_PAGE_SIZE = 10;
export const HOME_NEWS_PREVIEW_SIZE = 3;

const MY_POSTS_PAGE_SIZE = 10;

function postsPage(path: string, page: number): Promise<PostPageResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(MY_POSTS_PAGE_SIZE) });
  return apiGet<PostPageResponse>(`${path}?${params.toString()}`);
}

export const fetchMyPostsPage = (page: number) => postsPage("/api/posts/mine/page", page);
export const fetchBookmarkedPostsPage = (page: number) => postsPage("/api/posts/bookmarks/page", page);

// 게시글 댓글. 백엔드 GET/POST /api/posts/{id}/comments 응답과 1:1.
export type PostComment = {
  id: string;
  postId: string;
  author: { name: string; verified: boolean; profileImageUrl?: string | null };
  text: string;
  time: string;
  ownedByMe: boolean;
  edited: boolean;
  updatedAt: string | null;
  parentId?: string | null;
  replies?: PostComment[];
};

export type UpdatePostCommentRequest = { text: string };

export type PostCommentsPageResponse = {
  content: PostComment[];
  page: number;
  size: number;
  // pagination 은 최상위 댓글 기준, totalComments 는 답글 포함 전체 수.
  totalElements: number;
  totalPages: number;
  totalComments?: number;
};

export function fetchPostCommentsPage(
  postId: string,
  params: { page?: number; size?: number } = {},
): Promise<PostCommentsPageResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  return apiGet<PostCommentsPageResponse>(
    `/api/posts/${encodeURIComponent(postId)}/comments/page?${query.toString()}`,
  );
}

export function fetchPostCommentPageLocation(
  postId: string,
  commentId: string,
  size = 20,
): Promise<CommentPageLocationResponse> {
  const query = new URLSearchParams({ size: String(size) });
  return apiGet<CommentPageLocationResponse>(
    `/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/page?${query.toString()}`,
  );
}

export function updatePostComment(
  postId: string,
  commentId: string,
  body: UpdatePostCommentRequest,
): Promise<PostComment> {
  return apiPut<PostComment>(
    `/api/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    body,
  );
}

/** 공지·주보 상단 고정 토글 — 스태프 전용(서버에서 검증). */
export function setPostPinned(postId: string, pinned: boolean): Promise<Post> {
  return apiPatch<Post>(`/api/posts/${postId}/pin`, { pinned });
}
