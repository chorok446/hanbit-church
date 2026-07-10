package com.hanbit.api.praise

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "콘티 생성/수정 요청. 곡·공지는 전체 교체(replace) 방식.")
data class SavePraiseSetlistRequest(
    val title: String,
    @field:Schema(description = "예배 날짜(yyyy-MM-dd)")
    val worshipDate: String,
    @field:Schema(description = "예배 구분 표시 문구 (예: 주일 2부 예배)")
    val worshipType: String,
    val rehearsalTime: String? = null,
    val serviceTime: String? = null,
    val location: String? = null,
    @field:Schema(description = "DRAFT/CONFIRMED/COMPLETED/ARCHIVED")
    val status: String = PraiseSetlistStatus.DRAFT.name,
    val songs: List<PraiseSong> = emptyList(),
    val notices: List<PraiseNoticeItem> = emptyList(),
)

@Schema(description = "파트 배정 한 줄. 이름은 서버가 users 에서 snapshot 으로 채운다.")
data class PraiseAssignmentInput(
    val userId: Long,
    @field:Schema(description = "PraisePart 이름 (예: VOCAL)")
    val part: String,
)

@Schema(description = "콘티 배정 전체 교체 요청. 유지되는 (userId, part) 조합의 참석 응답은 보존된다.")
data class SavePraiseAssignmentsRequest(
    val assignments: List<PraiseAssignmentInput> = emptyList(),
)

@Schema(description = "본인 참석 응답 변경. 본인에게 배정이 없으면 404.")
data class UpdateMyAttendanceRequest(
    @field:Schema(description = "PENDING/AVAILABLE/LATE/UNAVAILABLE")
    val status: String,
    val memo: String? = null,
)

data class PraiseAssignmentResponse(
    val id: String,
    val userId: Long,
    val name: String,
    val part: String,
    val status: String,
    val memo: String?,
)

data class PraiseSetlistResponse(
    val id: String,
    val title: String,
    val worshipDate: String,
    val worshipType: String,
    val rehearsalTime: String?,
    val serviceTime: String?,
    val location: String?,
    val leaderUserId: Long?,
    val status: String,
    val songs: List<PraiseSong>,
    val notices: List<PraiseNoticeItem>,
    val assignments: List<PraiseAssignmentResponse>,
    val createdAt: String,
    val updatedAt: String,
)

data class PraiseSetlistSummaryResponse(
    val id: String,
    val title: String,
    val worshipDate: String,
    val worshipType: String,
    val serviceTime: String?,
    val location: String?,
    val status: String,
    val songCount: Int,
    val assignmentCount: Int,
    val createdAt: String,
)

data class PraiseSetlistPageResponse(
    val content: List<PraiseSetlistSummaryResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@Schema(description = "찬양팀 일정 생성/수정 요청")
data class SavePraiseScheduleRequest(
    val title: String,
    @field:Schema(description = "REHEARSAL/PART_PRACTICE/FULL_PRACTICE/WORSHIP/ETC")
    val type: String = PraiseScheduleType.REHEARSAL.name,
    @field:Schema(description = "시작 시각(ISO-8601 instant)")
    val startAt: String,
    val endAt: String? = null,
    val location: String? = null,
    val memo: String? = null,
    @field:Schema(description = "PRIVATE(팀 내부)/CHURCH(교인 공개)/PUBLIC(외부 공개)")
    val visibility: String = PraiseScheduleVisibility.PRIVATE.name,
    @field:Schema(description = "연결 콘티 id(선택)")
    val setlistId: String? = null,
)

data class PraiseScheduleResponse(
    val id: String,
    val title: String,
    val type: String,
    val startAt: String,
    val endAt: String?,
    val location: String?,
    val memo: String?,
    val visibility: String,
    val setlistId: String?,
    @field:Schema(description = "연결 콘티 제목(표시용). 콘티가 없거나 삭제됐으면 null")
    val setlistTitle: String? = null,
    val createdAt: String,
    val updatedAt: String,
)

@Schema(description = "찬양팀 파일 업로드 응답")
data class PraiseFileResponse(
    val url: String,
    @field:Schema(description = "image 또는 pdf")
    val kind: String,
    @field:Schema(description = "원본 파일명(표시용)")
    val name: String,
)

@Schema(description = "참석 리마인드 발송 결과")
data class PraiseRemindResponse(
    @field:Schema(description = "실제 알림을 보낸 인원 수(리더 본인 제외)")
    val remindedCount: Int,
    @field:Schema(description = "미응답(PENDING) 배정 인원 수")
    val pendingCount: Int,
)

@Schema(description = "곡 라이브러리 항목 — 과거 콘티 곡을 곡명 기준 distinct 집계한 것")
data class PraiseSongLibraryEntry(
    val title: String,
    @field:Schema(description = "가장 최근 사용된 콘티의 키")
    val key: String,
    val bpm: Int,
    @field:Schema(description = "worship 또는 praise")
    val type: String,
    @field:Schema(description = "이 곡이 쓰인 콘티 수")
    val useCount: Int,
    @field:Schema(description = "마지막 사용 예배일(yyyy-MM-dd)")
    val lastUsedDate: String,
)

@Schema(description = "찬양팀 팀원. 내부 명단 — 이메일·연락처는 노출하지 않는다.")
data class PraiseMemberResponse(
    val id: Long,
    val name: String,
    val praiseRole: String,
    val praiseParts: List<String>,
)
