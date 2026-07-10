package com.cheolma.api.post

// 익명 기도제목의 공개 표시용 작성자. 실명·프로필·authorId 를 모두 가린다.
private val ANONYMOUS_AUTHOR = Author("익명", false, null)

// viewerId 기준 소유 여부를 한 곳에서 판정한다. authorUserId 가 null(시드/기존 글)이거나
// 비로그인(viewerId=null)이거나 다른 사용자면 false. 이름이 아니라 authorUserId 로만 비교.
// 익명 글은 응답에서 작성자를 마스킹하되 ownedByMe 는 그대로 계산한다(본인 수정/삭제 유지).
fun Post.toResponse(
    viewerId: Long?,
    likedByMe: Boolean = false,
    bookmarkedByMe: Boolean = false,
) = PostResponse(
    id = id,
    author = if (anonymous) ANONYMOUS_AUTHOR else author,
    authorId = if (anonymous) null else authorUserId,
    time = time, text = text, tags = tags, images = images,
    likes = likes, comments = comments, eventId = eventId, category = category,
    attachments = attachments.orEmpty(), views = views, likedByMe = likedByMe,
    bookmarkedByMe = bookmarkedByMe,
    ownedByMe = authorUserId != null && authorUserId == viewerId,
    hidden = hiddenAt != null,
    createdAt = createdAt,
    anonymous = anonymous,
    visibility = visibility,
)

fun PostComment.toResponse(viewerId: Long?, replies: List<PostCommentResponse> = emptyList()) = PostCommentResponse(
    id = id,
    postId = postId,
    author = author,
    text = text,
    time = time,
    ownedByMe = authorUserId != null && authorUserId == viewerId,
    edited = updatedAt != null,
    updatedAt = updatedAt,
    parentId = parentId,
    replies = replies,
)
