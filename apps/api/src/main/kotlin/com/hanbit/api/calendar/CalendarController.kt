package com.hanbit.api.calendar

import com.hanbit.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** 공개 캘린더 — 수동 등록 일정 조회(누구나). */
@RestController
@RequestMapping("/api/calendar")
@Tag(name = "Calendar", description = "교회 일정(수동 등록) 조회")
class CalendarController(
    private val service: ManualCalendarService,
    private val ics: CalendarIcsService,
) {
    @Operation(summary = "수동 일정 목록 (공개). from/to(yyyy-MM-dd)로 범위 제한 가능")
    @GetMapping
    fun list(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
    ): List<ManualCalendarEventResponse> = service.list(from, to)

    @Operation(summary = "iCalendar(.ics) 구독 피드 — 수동 일정 + 공개 행사(진행 기간)")
    @GetMapping("/ics", produces = ["text/calendar;charset=UTF-8"])
    fun icsFeed(): org.springframework.http.ResponseEntity<String> =
        org.springframework.http.ResponseEntity.ok()
            .header("Content-Disposition", "inline; filename=hanbit-church.ics")
            .body(ics.buildFeed())
}

/** 수동 일정 관리 — ADMIN·OPERATOR (SecurityConfig 참조). */
@RestController
@RequestMapping("/api/admin/calendar")
@Tag(name = "AdminCalendar", description = "교회 일정(수동 등록) 관리")
class AdminCalendarController(
    private val service: ManualCalendarService,
) {
    @Operation(summary = "수동 일정 전체 목록")
    @GetMapping
    fun list(): List<ManualCalendarEventResponse> = service.list(null, null)

    @Operation(summary = "수동 일정 등록")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestBody req: SaveManualCalendarEventRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): ManualCalendarEventResponse = service.create(user, req)

    @Operation(summary = "수동 일정 수정")
    @PutMapping("/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody req: SaveManualCalendarEventRequest,
    ): ManualCalendarEventResponse = service.update(id, req)

    @Operation(summary = "수동 일정 삭제")
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: String): Map<String, Boolean> {
        service.delete(id)
        return mapOf("deleted" to true)
    }
}
