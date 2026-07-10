package com.cheolma.api.admin

import com.cheolma.api.newfamily.NewFamilyPageResponse
import com.cheolma.api.newfamily.NewFamilyResponse
import com.cheolma.api.newfamily.NewFamilyService
import com.cheolma.api.newfamily.SetContactedRequest
import com.cheolma.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 관리자 API. /api/admin 이하 전체가 SecurityConfig 에서 ROLE_ADMIN 으로 보호된다
 * (JwtAuthFilter 가 매 요청 DB role 을 읽어 권한을 부여하므로 권한 회수가 즉시 반영).
 */
@RestController
@RequestMapping("/api/admin")
@Tag(name = "Admin", description = "관리자 API (ROLE_ADMIN 전용)")
@SecurityRequirement(name = "bearerAuth")
class AdminController(
    private val service: AdminReportService,
    private val content: AdminContentService,
    private val userService: AdminUserService,
    private val actionLogs: AdminActionLogService,
    private val stats: AdminStatsService,
    private val newFamily: NewFamilyService,
) {

    @Operation(summary = "대시보드 요약 (사용자/게시글/행사/신고 수)")
    @GetMapping("/summary")
    fun summary(): AdminSummaryResponse = service.getSummary()

    @Operation(summary = "일별 통계 (최근 N일 가입·게시글·행사·신고 추이, KST 기준)")
    @GetMapping("/stats")
    fun stats(
        @RequestParam(defaultValue = "30") days: Int,
    ): AdminStatsResponse = stats.getDailyStats(days)

    @Operation(summary = "신고 목록 조회 (상태·대상종류 필터, 대상 미리보기 포함)")
    @GetMapping("/reports")
    fun reports(
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) targetType: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AdminReportsPageResponse = service.getReports(status, targetType, page, size)

    @Operation(summary = "신고 처리 (제재 확정 또는 기각, 신고자에게 결과 알림, 옵션으로 콘텐츠 숨김)")
    @PatchMapping("/reports/{id}")
    fun resolve(
        @PathVariable id: String,
        @RequestBody request: ResolveReportRequest,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminReportResponse = service.resolveReport(admin.id, id, request)

    @Operation(summary = "콘텐츠 관리 목록 (게시글/행사, 숨김 포함, 최신순)")
    @GetMapping("/content")
    fun contentList(
        @RequestParam(defaultValue = "POST") type: String,
        @RequestParam(defaultValue = "false") hiddenOnly: Boolean,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @RequestParam(required = false) q: String?,
    ): AdminContentPageResponse = content.listContent(type, hiddenOnly, page, size, q)

    @Operation(summary = "콘텐츠 숨김/복구 (soft hide, 작성자에게 알림)")
    @PatchMapping("/content/{targetType}/{targetId}")
    fun setContentVisibility(
        @PathVariable targetType: String,
        @PathVariable targetId: String,
        @RequestBody request: SetContentVisibilityRequest,
        @AuthenticationPrincipal admin: AuthUser,
    ): ContentVisibilityResponse = content.setVisibility(admin.id, targetType, targetId, request)

    @Operation(summary = "회원 목록 조회 (이메일/이름 검색, 정지 중 필터, 최신 가입 순)")
    @GetMapping("/users")
    fun adminUsers(
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "false") suspended: Boolean,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AdminUsersPageResponse = userService.getUsers(q, suspended, page, size)

    @Operation(summary = "가입 승인 대기 회원 목록 (오래 기다린 순)")
    @GetMapping("/users/pending")
    fun pendingUsers(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AdminUsersPageResponse = userService.getPendingUsers(page, size)

    @Operation(summary = "가입 승인 (승인 후 해당 회원이 로그인할 수 있다)")
    @PatchMapping("/users/{id}/approve")
    fun approveUser(
        @PathVariable id: Long,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminUserResponse = userService.approve(admin.id, id)

    @Operation(summary = "가입 거절 (계정 비활성화, 같은 이메일 재가입 가능)")
    @PatchMapping("/users/{id}/reject")
    fun rejectUser(
        @PathVariable id: Long,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminUserResponse = userService.reject(admin.id, id)

    @Operation(summary = "찬양팀 역할·파트 지정/해제 (최고 관리자 전용, 사이트 role 과 분리)")
    @PatchMapping("/users/{id}/praise")
    fun setPraiseRole(
        @PathVariable id: Long,
        @RequestBody request: SetPraiseRoleRequest,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminUserResponse = userService.setPraiseRole(admin.id, id, request)

    @Operation(summary = "회원 역할 변경 (승격/강등, 기존 토큰에도 즉시 반영. 본인 역할은 변경 불가)")
    @PatchMapping("/users/{id}/role")
    fun setUserRole(
        @PathVariable id: Long,
        @RequestBody request: SetUserRoleRequest,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminUserResponse = userService.setRole(admin.id, id, request)

    @Operation(summary = "회원 정지/해제 (로그인·기존 토큰·refresh 즉시 차단)")
    @PatchMapping("/users/{id}/suspension")
    fun setUserSuspension(
        @PathVariable id: Long,
        @RequestBody request: SetUserSuspensionRequest,
        @AuthenticationPrincipal admin: AuthUser,
    ): AdminUserResponse = userService.setSuspension(admin.id, id, request)

    @Operation(summary = "새가족 등록 신청 목록 (최신순, 미연락 필터)")
    @GetMapping("/new-family")
    fun newFamilyList(
        @RequestParam(defaultValue = "false") pendingOnly: Boolean,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): NewFamilyPageResponse = newFamily.getRegistrations(pendingOnly, page, size)

    @Operation(summary = "새가족 신청 연락 완료/해제 표시")
    @PatchMapping("/new-family/{id}")
    fun setNewFamilyContacted(
        @PathVariable id: String,
        @RequestBody request: SetContactedRequest,
    ): NewFamilyResponse = newFamily.setContacted(id, request.contacted)

    @Operation(summary = "감사 로그 조회 (관리자 조치 이력, 최신순, 조치 종류 필터)")
    @GetMapping("/logs")
    fun adminLogs(
        @RequestParam(required = false) action: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): AdminActionLogsPageResponse = actionLogs.getLogs(action, page, size)
}
