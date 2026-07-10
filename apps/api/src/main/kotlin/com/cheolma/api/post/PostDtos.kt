package com.cheolma.api.post

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant

@Schema(description = "게시글 작성 요청")
data class CreatePostRequest(
    @field:Schema(description = "본문(최대 1000자)")
    val text: String,
    @field:Schema(description = "이미지 URL 목록(최대 4개, http/https)")
    val images: List<String> = emptyList(),
    @field:Schema(description = "태그 목록(최대 10개)", example = "[\"#청년부\"]")
    val tags: List<String> = emptyList(),
    @field:Schema(description = "연결할 행사 id(선택)")
    val eventId: String? = null,
    @field:Schema(description = "카테고리(NOTICE/BULLETIN/SERMON/SHARING/PRAYER). 생략하면 SHARING.")
    val category: String? = null,
    @field:Schema(description = "첨부파일 목록(공지·주보 전용, 최대 3개)")
    val attachments: List<PostAttachment> = emptyList(),
    @field:Schema(description = "익명 게시(기도 카테고리 전용). 공개 응답에서 작성자가 마스킹된다.")
    val anonymous: Boolean = false,
    @field:Schema(description = "공개 범위(PUBLIC/MEMBERS). MEMBERS 는 기도 카테고리 전용 — 로그인 교인만 열람.")
    val visibility: String? = null,
)

@Schema(description = "게시글 수정 요청")
data class UpdatePostRequest(
    @field:Schema(description = "본문(최대 1000자)")
    val text: String,
    @field:Schema(description = "이미지 URL 목록(최대 4개, http/https)")
    val images: List<String> = emptyList(),
    @field:Schema(description = "태그 목록(최대 10개)")
    val tags: List<String> = emptyList(),
    @field:Schema(description = "연결할 행사 id(선택)")
    val eventId: String? = null,
    @field:Schema(description = "카테고리(NOTICE/BULLETIN/SERMON/SHARING/PRAYER). 생략하면 SHARING.")
    val category: String? = null,
    @field:Schema(description = "첨부파일 목록(공지·주보 전용, 최대 3개)")
    val attachments: List<PostAttachment> = emptyList(),
)

@Schema(description = "게시글 댓글 작성 요청")
data class CreateCommentRequest(
    @field:Schema(description = "댓글 본문(최대 500자)")
    val text: String,
    @field:Schema(description = "답글 대상 댓글 id(최상위 댓글만 가능). null 이면 일반 댓글.")
    val parentId: String? = null,
)

@Schema(description = "게시글 댓글 수정 요청")
data class UpdatePostCommentRequest(
    @field:Schema(description = "댓글 본문(최대 500자)")
    val text: String,
)

/** 댓글 응답. authorUserId 자체는 노출하지 않고 현재 사용자 기준 소유 여부만 제공한다. */
data class PostCommentResponse(
    val id: String,
    val postId: String,
    val author: Author,
    val text: String,
    val time: String,
    val ownedByMe: Boolean,
    val edited: Boolean,
    val updatedAt: Instant?,
    val parentId: String? = null,
    // 최상위 댓글일 때만 채워지는 1단계 답글 목록(오래된 순).
    val replies: List<PostCommentResponse> = emptyList(),
)

data class PostCommentsPageResponse(
    val content: List<PostCommentResponse>,
    val page: Int,
    val size: Int,
    // pagination 은 최상위 댓글 기준.
    val totalElements: Long,
    val totalPages: Int,
    // 답글을 포함한 전체 노출 댓글 수(카운트 표시용).
    val totalComments: Long = 0,
)

/** 게시글 응답. Post 필드 + 요청 유저 기준 좋아요/북마크/소유 상태. authorUserId 자체는 노출하지 않는다. */
data class PostResponse(
    val id: String,
    val author: Author,
    val authorId: Long? = null,
    val time: String,
    val text: String,
    val tags: List<String>,
    val images: List<String>,
    val likes: Int,
    val comments: Int,
    val eventId: String?,
    val category: String,
    val attachments: List<PostAttachment> = emptyList(),
    val views: Long = 0,
    val likedByMe: Boolean,
    val bookmarkedByMe: Boolean,
    val ownedByMe: Boolean,
    // 관리자 숨김 여부. 숨김 콘텐츠는 작성자 본인 경로(mine/상세)에서만 응답에 실린다.
    val hidden: Boolean = false,
    // 작성 시각. 시드 게시글은 null(작성 시점 미상).
    val createdAt: Instant? = null,
    // 익명 기도제목 여부. true 면 author/authorId 가 마스킹된 값이다.
    val anonymous: Boolean = false,
    // 공개 범위(PUBLIC/MEMBERS).
    val visibility: String = PostVisibility.PUBLIC,
)

data class PostSearchResponse(
    val content: List<PostResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

/** 마이페이지 게시글 목록(내 글/저장됨) pagination 응답. Spring Page 를 직접 노출하지 않는다. */
data class PostPageResponse(
    val content: List<PostResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)
