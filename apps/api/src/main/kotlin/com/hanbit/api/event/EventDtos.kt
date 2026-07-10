package com.hanbit.api.event

import com.hanbit.api.post.Author
import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant

@Schema(description = "행사 작성 요청. 날짜는 yyyy-MM-dd 또는 yyyy.MM.dd 를 허용한다.")
data class CreateEventRequest(
    @field:Schema(description = "제목")
    val title: String,
    @field:Schema(description = "요약")
    val summary: String = "",
    @field:Schema(description = "본문")
    val body: String = "",
    @field:Schema(description = "썸네일 URL")
    val thumb: String = "",
    @field:Schema(description = "모집 시작일", example = "2026-07-01")
    val recruitStart: String = "",
    @field:Schema(description = "모집 종료일", example = "2026-07-10")
    val recruitEnd: String = "",
    @field:Schema(description = "진행 시작일", example = "2026-07-15")
    val runStart: String = "",
    @field:Schema(description = "진행 종료일", example = "2026-07-20")
    val runEnd: String = "",
    @field:Schema(description = "모집 정원", example = "20")
    val capacity: Int = 0,
    @field:Schema(description = "장소(선택)", example = "본당 2층")
    val place: String = "",
    @field:Schema(description = "대상(선택)", example = "청년부")
    val audience: String = "",
    @field:Schema(description = "참가비(선택)", example = "1인 1만원")
    val fee: String = "",
    @field:Schema(description = "준비물(선택)", example = "성경, 필기구")
    val supplies: String = "",
    @field:Schema(description = "문의(선택)", example = "청년부 임원")
    val contact: String = "",
)

@Schema(description = "행사 수정 요청. status 가 upcoming 일 때만 허용된다.")
data class UpdateEventRequest(
    @field:Schema(description = "제목")
    val title: String,
    @field:Schema(description = "요약")
    val summary: String = "",
    @field:Schema(description = "본문")
    val body: String = "",
    @field:Schema(description = "썸네일 URL")
    val thumb: String = "",
    @field:Schema(description = "모집 시작일", example = "2026-07-01")
    val recruitStart: String = "",
    @field:Schema(description = "모집 종료일", example = "2026-07-10")
    val recruitEnd: String = "",
    @field:Schema(description = "진행 시작일", example = "2026-07-15")
    val runStart: String = "",
    @field:Schema(description = "진행 종료일", example = "2026-07-20")
    val runEnd: String = "",
    @field:Schema(description = "모집 정원", example = "20")
    val capacity: Int = 0,
    @field:Schema(description = "장소(선택)", example = "본당 2층")
    val place: String = "",
    @field:Schema(description = "대상(선택)", example = "청년부")
    val audience: String = "",
    @field:Schema(description = "참가비(선택)", example = "1인 1만원")
    val fee: String = "",
    @field:Schema(description = "준비물(선택)", example = "성경, 필기구")
    val supplies: String = "",
    @field:Schema(description = "문의(선택)", example = "청년부 임원")
    val contact: String = "",
)

@Schema(description = "모집 상태 변경 요청")
data class UpdateEventStatusRequest(
    @field:Schema(description = "목표 상태", example = "open", allowableValues = ["upcoming", "open", "closed"])
    val status: String,
)

data class EventParticipantResponse(
    val participantId: String,
    val name: String,
    val verified: Boolean,
)

data class EventParticipantsResponse(
    val eventId: String,
    val title: String,
    val status: String,
    val capacity: Int,
    val joined: Int,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val participants: List<EventParticipantResponse>,
)

/** 참가자 퇴장 결과. 갱신된 joined 를 함께 반환하고 participant.userId 는 노출하지 않는다. */
data class EventParticipantRemovalResponse(
    val eventId: String,
    val participantId: String,
    val removed: Boolean,
    val joined: Int,
)

/** Event 응답. 참여·소유 상태는 현재 요청 사용자 기준이며 authorUserId 자체는 노출하지 않는다. */
data class EventResponse(
    val id: String,
    val status: String,
    val title: String,
    val summary: String,
    val thumb: String,
    val recruitStart: String,
    val recruitEnd: String,
    val runStart: String,
    val runEnd: String,
    val capacity: Int,
    val joined: Int,
    val daysLeftLabel: String,
    val recruitable: Boolean,
    val recruitState: String,
    val author: Author,
    val body: EventBody,
    val joinedByMe: Boolean,
    val bookmarkedByMe: Boolean,
    val ownedByMe: Boolean,
    @field:Schema(description = "내용 수정 여부 — '수정됨' 표시용")
    val edited: Boolean = false,
    // 관리자 숨김 여부. 숨김 콘텐츠는 개설자 본인 경로(mine/상세)에서만 응답에 실린다.
    val hidden: Boolean = false,
    // 실무 안내(전부 선택). null 이면 프론트 상세에서 해당 행을 숨긴다.
    val place: String? = null,
    val audience: String? = null,
    val fee: String? = null,
    val supplies: String? = null,
    val contact: String? = null,
)

data class EventSearchResponse(
    val content: List<EventResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

/** 마이페이지 행사 목록(참여/개설) pagination 응답. Spring Page 를 직접 노출하지 않는다. */
data class EventPageResponse(
    val content: List<EventResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

data class EventCommentResponse(
    val id: String,
    val eventId: String,
    val author: Author,
    val text: String,
    val createdAt: Instant,
    val ownedByMe: Boolean,
    val edited: Boolean,
    val updatedAt: Instant?,
    val parentId: String? = null,
    // 최상위 댓글일 때만 채워지는 1단계 답글 목록(오래된 순).
    val replies: List<EventCommentResponse> = emptyList(),
)

data class EventCommentsResponse(
    val content: List<EventCommentResponse>,
    val page: Int,
    val size: Int,
    // pagination 은 최상위 댓글 기준.
    val totalElements: Long,
    val totalPages: Int,
    // 답글을 포함한 전체 노출 댓글 수(카운트 표시용).
    val totalComments: Long = 0,
)

data class EventProofResponse(
    val id: String,
    val eventId: String,
    val author: Author,
    val text: String,
    val images: List<String>,
    val createdAt: Instant,
    val ownedByMe: Boolean,
)

data class EventProofsResponse(
    val content: List<EventProofResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    // 현재 사용자가 이미 인증을 남겼는지(숨김 포함). 비로그인은 false.
    val proofedByMe: Boolean,
)

@Schema(description = "행사 참여 후기 작성 요청")
data class CreateEventProofRequest(
    @field:Schema(description = "인증 소감(최대 500자)")
    val text: String,
    @field:Schema(description = "후기 사진 URL 목록(최대 4장)")
    val images: List<String> = emptyList(),
)

@Schema(description = "행사 댓글 작성 요청")
data class CreateEventCommentRequest(
    @field:Schema(description = "댓글 본문(최대 500자)")
    val text: String,
    @field:Schema(description = "답글 대상 댓글 id(최상위 댓글만 가능). null 이면 일반 댓글.")
    val parentId: String? = null,
)

@Schema(description = "행사 댓글 수정 요청")
data class UpdateEventCommentRequest(
    @field:Schema(description = "댓글 본문(최대 500자)")
    val text: String,
)

/** 참가자 명단 CSV 다운로드 페이로드. bytes 는 UTF-8 BOM 포함. */
data class EventParticipantsCsv(val filename: String, val bytes: ByteArray)
