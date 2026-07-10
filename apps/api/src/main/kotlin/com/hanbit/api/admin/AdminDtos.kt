package com.hanbit.api.admin

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "관리자용 신고 항목. 신고 원본 + 신고자 + 대상 미리보기를 함께 담는다.")
data class AdminReportResponse(
    val id: String,
    val targetType: String,
    val targetId: String,
    val reason: String,
    val detail: String?,
    val time: String,
    @field:Schema(description = "처리 상태", allowableValues = ["PENDING", "RESOLVED", "DISMISSED"])
    val status: String,
    val resolutionNote: String?,
    val resolvedAt: String?,
    val reporter: AdminReportUserResponse,
    @field:Schema(description = "신고 대상 미리보기. 대상이 삭제됐으면 null.")
    val target: AdminReportTargetResponse?,
    @field:Schema(description = "같은 대상에 접수된 신고 수(본 건 포함)")
    val targetReportCount: Long,
)

data class AdminReportUserResponse(
    val id: Long,
    val name: String,
    val email: String?,
)

data class AdminReportTargetResponse(
    @field:Schema(description = "대상 본문 발췌(태그 제거, 최대 200자)")
    val excerpt: String,
    val authorName: String,
    @field:Schema(description = "대상으로 이동하는 프론트 경로", example = "/posts/p1")
    val href: String,
    @field:Schema(description = "현재 숨김 상태 여부")
    val hidden: Boolean = false,
)

data class AdminReportsPageResponse(
    val content: List<AdminReportResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    @field:Schema(description = "전체 대기(PENDING) 신고 수. 필터와 무관한 큐 크기.")
    val pendingCount: Long,
)

@Schema(description = "신고 처리 요청")
data class ResolveReportRequest(
    @field:Schema(description = "처리 결과", allowableValues = ["RESOLVED", "DISMISSED"])
    val status: String,
    @field:Schema(description = "처리 메모(선택, 최대 500자). 신고자 알림에도 포함된다.")
    val note: String? = null,
    @field:Schema(description = "RESOLVED 처리 시 대상 콘텐츠를 함께 숨길지 여부. 대상이 이미 삭제됐으면 무시된다.")
    val hideContent: Boolean = false,
)

@Schema(description = "콘텐츠 숨김/복구 요청")
data class SetContentVisibilityRequest(
    @field:Schema(description = "true = 숨김, false = 복구")
    val hidden: Boolean,
    @field:Schema(description = "숨김 사유(선택, 최대 500자). 작성자 알림에 포함된다.")
    val reason: String? = null,
)

@Schema(description = "일괄 숨김/복구 대상 항목")
data class BulkContentItem(val targetType: String, val targetId: String)

@Schema(description = "콘텐츠 일괄 숨김/복구 요청 (최대 50건)")
data class SetContentVisibilityBulkRequest(
    val items: List<BulkContentItem>,
    @field:Schema(description = "true = 숨김, false = 복구")
    val hidden: Boolean,
    @field:Schema(description = "숨김 사유(선택) — 모든 항목에 동일하게 적용, 작성자 알림 포함")
    val reason: String? = null,
)

data class ContentVisibilityBulkResponse(
    val requested: Int,
    val processed: Int,
    @field:Schema(description = "찾지 못해 건너뛴 항목")
    val missing: List<BulkContentItem>,
    val hidden: Boolean,
)

data class ContentVisibilityResponse(
    val targetType: String,
    val targetId: String,
    val hidden: Boolean,
)

@Schema(description = "관리자용 회원 항목")
data class AdminUserResponse(
    val id: Long,
    val email: String,
    val name: String,
    val verified: Boolean,
    @field:Schema(description = "역할", allowableValues = ["USER", "ADMIN"])
    val role: String,
    @field:Schema(description = "탈퇴 여부(탈퇴 시 email/name 은 익명화된 값)")
    val deleted: Boolean,
    @field:Schema(description = "현재 정지 중 여부")
    val suspended: Boolean,
    @field:Schema(description = "정지 만료 시각(ISO-8601). 정지 중이 아니면 null.")
    val suspendedUntil: String?,
    val suspendedReason: String?,
    @field:Schema(description = "가입 시각(ISO-8601). 가입일 기록 도입 이전 회원은 null.")
    val createdAt: String?,
    val postCount: Long,
    val eventCount: Long,
    @field:Schema(description = "2단계 인증(TOTP) 활성 여부 — 기기 분실 잠금 해제 대상 판단용")
    val twoFactorEnabled: Boolean = false,
    @field:Schema(description = "가입 승인 대기 여부")
    val pendingApproval: Boolean = false,
    @field:Schema(description = "찬양팀 역할(LEADER/MEMBER/GUEST). null = 찬양팀 아님")
    val praiseRole: String? = null,
    val praiseParts: List<String> = emptyList(),
)

data class AdminUsersPageResponse(
    val content: List<AdminUserResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@Schema(description = "회원 역할 변경 요청")
data class SetUserRoleRequest(
    @field:Schema(description = "변경할 역할", allowableValues = ["USER", "ADMIN"])
    val role: String,
)

@Schema(description = "회원 정지/해제 요청")
data class SetUserSuspensionRequest(
    @field:Schema(description = "정지 만료 시각(ISO-8601 instant). null 이면 정지 해제.", example = "2026-08-01T00:00:00Z")
    val suspendedUntil: String? = null,
    @field:Schema(description = "정지 사유(선택, 최대 500자)")
    val reason: String? = null,
)

@Schema(description = "관리자 감사 로그 항목")
data class AdminActionLogResponse(
    val id: Long,
    @field:Schema(
        description = "조치 종류",
        allowableValues = ["REPORT_RESOLVED", "REPORT_DISMISSED", "CONTENT_HIDDEN", "CONTENT_RESTORED", "USER_SUSPENDED", "USER_UNSUSPENDED"],
    )
    val action: String,
    @field:Schema(description = "조치 대상 종류(REPORT/USER 또는 콘텐츠 타입)")
    val targetType: String,
    val targetId: String,
    @field:Schema(description = "조치 부가 정보(처리 메모/숨김 사유/정지 기간·사유)")
    val detail: String?,
    @field:Schema(description = "조치 시각(ISO-8601)")
    val createdAt: String,
    val admin: AdminReportUserResponse,
)

data class AdminActionLogsPageResponse(
    val content: List<AdminActionLogResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@Schema(description = "관리자 일별 통계 항목")
data class AdminDailyStat(
    @field:Schema(description = "날짜(YYYY-MM-DD, KST)")
    val date: String,
    val signups: Long,
    val posts: Long,
    val events: Long,
    val reports: Long,
    @field:Schema(description = "일별 활성 회원 수(접속 기록 기준 distinct 사용자)")
    val activeUsers: Long = 0,
)

@Schema(description = "관리자 일별 통계 (가입·게시글·행사·신고 추이)")
data class AdminStatsResponse(
    val days: Int,
    val daily: List<AdminDailyStat>,
)

@Schema(description = "관리자 대시보드 요약")
data class AdminSummaryResponse(
    val users: Long,
    val posts: Long,
    val events: Long,
    val pendingReports: Long,
    val totalReports: Long,
    @field:Schema(description = "현재 정지 중인 회원 수")
    val suspendedUsers: Long,
    @field:Schema(description = "모집중이면서 마감일이 3일 이내(경과 포함)인 행사 수 — 마감 처리 대기")
    val closingSoonEvents: Long = 0,
)

@Schema(description = "찬양팀 역할·파트 지정 요청. role null = 찬양팀 해제.")
data class SetPraiseRoleRequest(
    @field:Schema(description = "찬양팀 역할(LEADER/MEMBER/GUEST). null 이면 해제")
    val praiseRole: String? = null,
    @field:Schema(description = "파트 목록(PraisePart)")
    val praiseParts: List<String> = emptyList(),
)

/** 콘텐츠 관리 목록 항목 — 게시글(text 요약)·행사(제목) 공통 표현. */
data class AdminContentItemResponse(
    val targetType: String, // POST | EVENT
    val id: String,
    val title: String,
    val category: String?, // POST 카테고리 / EVENT 는 모집 상태
    val authorName: String,
    val hidden: Boolean,
    val hiddenReason: String?,
    val deleted: Boolean,
)

data class AdminContentPageResponse(
    val content: List<AdminContentItemResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@Schema(description = "비밀번호 초기화 응답 — 임시 비밀번호는 이 응답에서만 노출된다")
data class AdminPasswordResetResponse(
    val userId: Long,
    @field:Schema(description = "한 번만 표시되는 임시 비밀번호. 서버는 해시만 저장한다")
    val tempPassword: String,
)
