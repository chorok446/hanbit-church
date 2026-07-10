package com.hanbit.api.event

import java.time.LocalDate

/** viewerId 기준 소유 여부와 today 기준 모집 상태를 한 곳에서 판정한다. authorUserId 는 노출하지 않는다. */
fun Event.toResponse(
    viewerId: Long?,
    joinedByMe: Boolean,
    bookmarkedByMe: Boolean,
    today: LocalDate,
): EventResponse {
    val recruitment = recruitmentOn(today)
    return EventResponse(
        id = id, status = status, title = title, summary = summary, thumb = thumb,
        recruitStart = canonicalEventDateOrOriginal(recruitStart),
        recruitEnd = canonicalEventDateOrOriginal(recruitEnd),
        runStart = canonicalEventDateOrOriginal(runStart),
        runEnd = canonicalEventDateOrOriginal(runEnd),
        capacity = capacity, joined = joined, daysLeftLabel = recruitment.daysLeftLabel,
        recruitable = recruitment.recruitable, recruitState = recruitment.state.value,
        author = author, body = body, joinedByMe = joinedByMe, bookmarkedByMe = bookmarkedByMe,
        ownedByMe = authorUserId != null && authorUserId == viewerId,
    edited = updatedAt != null,
        hidden = hiddenAt != null,
        place = place, audience = audience, fee = fee, supplies = supplies, contact = contact,
    )
}

fun EventProof.toResponse(viewerId: Long?) = EventProofResponse(
    id = id,
    eventId = eventId,
    author = author,
    text = text,
    images = images,
    createdAt = createdAt,
    ownedByMe = authorUserId == viewerId,
)

fun EventComment.toResponse(viewerId: Long?, replies: List<EventCommentResponse> = emptyList()) = EventCommentResponse(
    id = id,
    eventId = eventId,
    author = author,
    text = text,
    createdAt = createdAt,
    ownedByMe = authorUserId != null && authorUserId == viewerId,
    edited = updatedAt != null,
    updatedAt = updatedAt,
    parentId = parentId,
    replies = replies,
)
