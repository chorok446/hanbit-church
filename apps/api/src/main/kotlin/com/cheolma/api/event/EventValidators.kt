package com.cheolma.api.event

import com.cheolma.api.common.splitRichBodyHtml
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

private const val MAX_CAPACITY = 10000
private const val MAX_COMMENT_TEXT_LENGTH = 500

data class NormalizedEventInput(
    val title: String,
    val summary: String,
    val body: EventBody,
    val thumb: String,
    val recruitStart: String,
    val recruitEnd: String,
    val runStart: String,
    val runEnd: String,
    val capacity: Int,
    // 실무 안내(선택). blank 는 null 로 정규화해 저장한다.
    val place: String?,
    val audience: String?,
    val fee: String?,
    val supplies: String?,
    val contact: String?,
)

/** 선택 안내 필드 정규화 — trim 후 blank 는 null, 길이 초과는 400. */
private fun normalizeOptionalInfo(value: String, field: String, maxLength: Int): String? {
    val trimmed = value.trim()
    if (trimmed.isEmpty()) return null
    if (trimmed.length > maxLength) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "$field must not exceed $maxLength characters")
    }
    return trimmed
}

/** 생성·수정이 반드시 같은 검증과 정규화 규칙을 사용하도록 한 곳에서 처리한다. */
fun normalizeEventInput(
    title: String,
    summary: String,
    body: String,
    thumb: String,
    recruitStartValue: String,
    recruitEndValue: String,
    runStartValue: String,
    runEndValue: String,
    capacity: Int,
    place: String = "",
    audience: String = "",
    fee: String = "",
    supplies: String = "",
    contact: String = "",
): NormalizedEventInput {
    val normalizedTitle = title.trim()
    if (normalizedTitle.isBlank()) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required")
    }
    if (capacity <= 0) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "capacity must be positive")
    }
    if (capacity > MAX_CAPACITY) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "capacity is too large")
    }

    // ISO와 legacy 점 표기를 strict parsing한 뒤 저장 값은 ISO로 통일한다.
    val recruitStart = parseEventDate(recruitStartValue, "recruitStart")
    val recruitEnd = parseEventDate(recruitEndValue, "recruitEnd")
    val runStart = parseEventDate(runStartValue, "runStart")
    val runEnd = parseEventDate(runEndValue, "runEnd")
    if (recruitStart.isAfter(recruitEnd)) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "recruitStart must be on or before recruitEnd")
    }
    if (recruitEnd.isAfter(runStart)) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "recruitEnd must be on or before runStart")
    }
    if (runStart.isAfter(runEnd)) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "runStart must be on or before runEnd")
    }

    val normalizedBody = body.trim()
    val (paragraphHtml, imageUrls) = splitRichBodyHtml(normalizedBody)
    return NormalizedEventInput(
        title = normalizedTitle,
        summary = summary.trim(),
        body = EventBody("행사 소개", listOf(paragraphHtml).filter { it.isNotBlank() }, imageUrls),
        thumb = thumb.trim(),
        recruitStart = recruitStart.toString(),
        recruitEnd = recruitEnd.toString(),
        runStart = runStart.toString(),
        runEnd = runEnd.toString(),
        capacity = capacity,
        place = normalizeOptionalInfo(place, "place", 200),
        audience = normalizeOptionalInfo(audience, "audience", 200),
        fee = normalizeOptionalInfo(fee, "fee", 200),
        supplies = normalizeOptionalInfo(supplies, "supplies", 500),
        contact = normalizeOptionalInfo(contact, "contact", 200),
    )
}

/** 행사 댓글 본문 trim + blank/length 검증. */
fun normalizeEventCommentText(value: String): String {
    val text = value.trim()
    if (text.isEmpty()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required")
    if (text.length > MAX_COMMENT_TEXT_LENGTH) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "text must not exceed $MAX_COMMENT_TEXT_LENGTH characters")
    }
    return text
}
