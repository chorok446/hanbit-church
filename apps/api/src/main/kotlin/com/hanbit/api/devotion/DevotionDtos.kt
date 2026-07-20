package com.hanbit.api.devotion

import java.time.Instant
import java.time.LocalDate

/** 큐티 묵상 상세/응답. scheduled=true 면 미래 날짜 예약분(관리자에게만 노출). */
data class DevotionResponse(
    val id: String,
    val date: LocalDate,
    val verseRef: String,
    val verseText: String,
    val meditation: String,
    val authorName: String,
    val comments: Int,
    val scheduled: Boolean,
    val createdAt: Instant,
    val updatedAt: Instant,
)

/** 목록용 요약 — 묵상 본문은 발췌만 싣는다. */
data class DevotionSummary(
    val id: String,
    val date: LocalDate,
    val verseRef: String,
    val verseText: String,
    val excerpt: String,
    val comments: Int,
    val scheduled: Boolean,
)

data class DevotionPageResponse(
    val content: List<DevotionSummary>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

/** 관리자 등록·수정. authorName 미지정 시 요청자 이름을 쓴다. */
data class SaveDevotionRequest(
    val date: String,
    val verseRef: String,
    val verseText: String,
    val meditation: String,
    val authorName: String? = null,
)

data class DevotionCommentResponse(
    val id: String,
    val authorName: String,
    val text: String,
    val createdAt: Instant,
    /** 요청자가 삭제 가능한 댓글인지(본인 또는 콘텐츠 스태프). */
    val canDelete: Boolean,
)

data class CreateDevotionCommentRequest(val text: String)
