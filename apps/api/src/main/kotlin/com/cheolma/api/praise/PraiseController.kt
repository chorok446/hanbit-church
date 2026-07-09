package com.cheolma.api.praise

import com.cheolma.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

/**
 * 찬양팀 내부 API. SecurityConfig 는 `/api/praise` 하위 경로에 인증만 요구하고
 * (예외: GET `/api/praise/schedules/public` 은 공개 — 응답 범위를 서비스가 층별로 좁힌다),
 * 찬양팀 권한(멤버 조회 / 리더 쓰기)은 PraiseService/PraiseScheduleService 가 DB praiseRole 로 검사한다.
 */
@RestController
@RequestMapping("/api/praise")
@Tag(name = "Praise", description = "찬양팀 콘티·배정·참석·일정 (찬양팀 내부 전용)")
class PraiseController(
    private val service: PraiseService,
    private val scheduleService: PraiseScheduleService,
) {
    @Operation(summary = "콘티 목록 — 예배일 최신순 페이지 (찬양팀 멤버·관리자)")
    @GetMapping("/setlists")
    fun getSetlists(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseSetlistPageResponse = service.getSetlists(me.id, page, size)

    @Operation(summary = "콘티 상세 (찬양팀 멤버·관리자)")
    @GetMapping("/setlists/{id}")
    fun getSetlist(@PathVariable id: String, @AuthenticationPrincipal me: AuthUser): PraiseSetlistResponse =
        service.getSetlist(me.id, id)

    @Operation(summary = "콘티 생성 (찬양팀 리더·관리자)")
    @PostMapping("/setlists")
    @ResponseStatus(HttpStatus.CREATED)
    fun createSetlist(
        @RequestBody request: SavePraiseSetlistRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseSetlistResponse = service.create(me.id, request)

    @Operation(summary = "콘티 수정 — 예배 정보·곡·공지·상태 전체 교체 (찬양팀 리더·관리자)")
    @PutMapping("/setlists/{id}")
    fun updateSetlist(
        @PathVariable id: String,
        @RequestBody request: SavePraiseSetlistRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseSetlistResponse = service.update(me.id, id, request)

    @Operation(summary = "콘티 삭제 (찬양팀 리더·관리자)")
    @DeleteMapping("/setlists/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteSetlist(@PathVariable id: String, @AuthenticationPrincipal me: AuthUser) {
        service.delete(me.id, id)
    }

    @Operation(summary = "파트 배정 전체 교체 (찬양팀 리더·관리자). 유지되는 배정의 참석 응답은 보존")
    @PutMapping("/setlists/{id}/assignments")
    fun setAssignments(
        @PathVariable id: String,
        @RequestBody request: SavePraiseAssignmentsRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseSetlistResponse = service.setAssignments(me.id, id, request)

    @Operation(summary = "본인 참석 응답 변경 — 본인 배정이 없으면 404")
    @PatchMapping("/setlists/{id}/attendance")
    fun updateMyAttendance(
        @PathVariable id: String,
        @RequestBody request: UpdateMyAttendanceRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): List<PraiseAssignmentResponse> = service.updateMyAttendance(me.id, id, request)

    @Operation(summary = "미응답자 참석 리마인드 발송 (찬양팀 리더·관리자)")
    @PostMapping("/setlists/{id}/attendance/remind")
    fun remindAttendance(
        @PathVariable id: String,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseRemindResponse = service.remindPendingAttendance(me.id, id)

    @Operation(summary = "찬양팀 팀원 목록 — 이름·역할·파트만 (이메일·연락처 비노출)")
    @GetMapping("/members")
    fun getMembers(@AuthenticationPrincipal me: AuthUser): List<PraiseMemberResponse> =
        service.getMembers(me.id)

    @Operation(summary = "곡 라이브러리 — 과거 콘티 곡을 곡명 기준 집계 (찬양팀 멤버·관리자)")
    @GetMapping("/songs")
    fun getSongLibrary(
        @RequestParam(required = false) q: String?,
        @AuthenticationPrincipal me: AuthUser,
    ): List<PraiseSongLibraryEntry> = service.getSongLibrary(me.id, q)

    // ─── 일정 ───

    @Operation(summary = "찬양팀 일정 목록 — PRIVATE 포함 전체 (찬양팀 멤버·관리자)")
    @GetMapping("/schedules")
    fun getSchedules(
        @RequestParam(defaultValue = "false") includePast: Boolean,
        @AuthenticationPrincipal me: AuthUser,
    ): List<PraiseScheduleResponse> = scheduleService.getSchedules(me.id, includePast)

    @Operation(
        summary = "교회 캘린더용 공개 일정",
        description = "요청자에 따라 범위가 좁혀진다 — 찬양팀 멤버·관리자: 전체, 로그인 교인: CHURCH+PUBLIC, 비로그인: PUBLIC.",
    )
    @GetMapping("/schedules/public")
    fun getPublicSchedules(@AuthenticationPrincipal me: AuthUser?): List<PraiseScheduleResponse> =
        scheduleService.getPublicSchedules(me?.id)

    @Operation(summary = "일정 생성 (찬양팀 리더·관리자)")
    @PostMapping("/schedules")
    @ResponseStatus(HttpStatus.CREATED)
    fun createSchedule(
        @RequestBody request: SavePraiseScheduleRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseScheduleResponse = scheduleService.create(me.id, request)

    @Operation(summary = "일정 수정 (찬양팀 리더·관리자)")
    @PutMapping("/schedules/{id}")
    fun updateSchedule(
        @PathVariable id: String,
        @RequestBody request: SavePraiseScheduleRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseScheduleResponse = scheduleService.update(me.id, id, request)

    @Operation(summary = "일정 삭제 (찬양팀 리더·관리자)")
    @DeleteMapping("/schedules/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteSchedule(@PathVariable id: String, @AuthenticationPrincipal me: AuthUser) {
        scheduleService.delete(me.id, id)
    }

    // ─── 파일 ───

    @Operation(
        summary = "찬양팀 자료 업로드 — 악보 사진(jpeg/png/webp)·PDF (찬양팀 리더·관리자)",
        description = "이미지 5MB·PDF 10MB. 인증 서빙(GET /api/praise/files/{name})으로만 접근 가능하다.",
    )
    @PostMapping("/files", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadFile(
        @RequestParam("file") file: MultipartFile,
        @AuthenticationPrincipal me: AuthUser,
    ): PraiseFileResponse = service.uploadFile(me.id, file)

    @Operation(
        summary = "찬양팀 자료 인증 서빙 (찬양팀 멤버·관리자)",
        description = "업로드된 악보 사진·PDF 를 스트리밍한다. 비멤버는 403. 이미지는 인라인, PDF 는 다운로드.",
    )
    @GetMapping("/files/{filename}")
    fun getFile(
        @PathVariable filename: String,
        @AuthenticationPrincipal me: AuthUser,
    ): ResponseEntity<ByteArray> {
        val content = service.readFile(me.id, filename)
        val disposition = if (content.inline) "inline" else "attachment"
        return ResponseEntity.ok()
            .header("Content-Type", content.contentType)
            .header("X-Content-Type-Options", "nosniff")
            .header("Content-Disposition", disposition)
            // 내부 자료라 공유 캐시(프록시·CDN)에는 저장하지 않는다. 브라우저 개인 캐시만 짧게 허용.
            .header("Cache-Control", "private, max-age=300")
            .body(content.bytes)
    }
}
