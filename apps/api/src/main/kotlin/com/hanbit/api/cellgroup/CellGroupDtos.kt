package com.hanbit.api.cellgroup

import io.swagger.v3.oas.annotations.media.Schema

// ─── 요청 ───

@Schema(description = "목장 생성/수정 요청. leaderUserId·active 는 매니저만 반영된다(리더는 이름·구역·설명만).")
data class SaveCellGroupRequest(
    val name: String,
    val district: String? = null,
    val description: String? = null,
    @field:Schema(description = "목장 리더 user id(매니저 전용). null 로 보내면 리더 해제.")
    val leaderUserId: Long? = null,
    @field:Schema(description = "활성 여부(매니저 전용). 비활성 목장은 일반 목록에서 숨겨진다.")
    val active: Boolean = true,
)

@Schema(description = "로스터 한 줄. 이름은 서버가 users 에서 snapshot 으로 채운다.")
data class CellGroupMemberInput(
    val userId: Long,
    @field:Schema(description = "LEADER/MEMBER")
    val role: String = CellGroupMemberRole.MEMBER.name,
)

@Schema(description = "로스터 전체 교체 요청(매니저 전용). 유지되는 멤버의 joinedAt·역할 snapshot 은 보존된다.")
data class SetCellGroupMembersRequest(
    val members: List<CellGroupMemberInput> = emptyList(),
)

@Schema(description = "모임 참석 한 줄.")
data class CellMeetingAttendanceInput(
    val userId: Long,
    @field:Schema(description = "PRESENT/ABSENT/EXCUSED")
    val status: String = CellMeetingAttendanceStatus.PRESENT.name,
)

@Schema(description = "목장 모임 생성/수정 요청(리더·매니저). 참석·나눔은 전체 교체.")
data class SaveCellMeetingRequest(
    val title: String,
    @field:Schema(description = "모임 시각(ISO-8601 instant)")
    val meetAt: String,
    val location: String? = null,
    @field:Schema(description = "모임 안내/주제")
    val agenda: String? = null,
    @field:Schema(description = "나눔 기록(모임 후 작성)")
    val sharingNote: String? = null,
    @field:Schema(description = "참석 기록. 로스터 밖 userId 는 400.")
    val attendance: List<CellMeetingAttendanceInput> = emptyList(),
)

// ─── 응답 ───

@Schema(description = "목장 디렉터리 항목(요약). 로스터 이름은 담지 않는다 — 상세는 멤버만.")
data class CellGroupSummaryResponse(
    val id: String,
    val name: String,
    val district: String?,
    val leaderUserId: Long?,
    val leaderName: String?,
    val memberCount: Int,
    val active: Boolean,
    @field:Schema(description = "요청자가 이 목장 소속(멤버·리더)인지")
    val mine: Boolean,
)

data class CellGroupMemberResponse(
    val userId: Long,
    val name: String,
    val role: String,
    val joinedAt: String,
)

data class CellMeetingAttendanceResponse(
    val userId: Long,
    val name: String,
    val status: String,
)

data class CellMeetingResponse(
    val id: String,
    val title: String,
    val meetAt: String,
    val location: String?,
    val agenda: String?,
    val sharingNote: String?,
    val attendance: List<CellMeetingAttendanceResponse>,
    val createdAt: String,
    val updatedAt: String,
)

@Schema(description = "목장 상세 — 정보 + 로스터 + 모임(스케줄·기록). 멤버·리더·매니저만.")
data class CellGroupDetailResponse(
    val id: String,
    val name: String,
    val district: String?,
    val leaderUserId: Long?,
    val leaderName: String?,
    val description: String?,
    val active: Boolean,
    val members: List<CellGroupMemberResponse>,
    val meetings: List<CellMeetingResponse>,
    @field:Schema(description = "요청자가 이 목장을 관리(리더·매니저)할 수 있는지 — 프론트 편집 UI 게이트용")
    val canManage: Boolean,
    @field:Schema(description = "요청자가 매니저(로스터 편집 가능)인지")
    val canManageRoster: Boolean,
    val createdAt: String,
    val updatedAt: String,
)

@Schema(description = "로스터 추가 후보(매니저 검색용). 이름만 — 이메일·연락처 비노출.")
data class CellGroupCandidateResponse(
    val id: Long,
    val name: String,
)
