package com.hanbit.api.calendar

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "수동 일정 작성/수정 요청. 날짜는 yyyy-MM-dd.")
data class SaveManualCalendarEventRequest(
    @field:Schema(description = "제목", example = "부활절 새벽 연합 예배")
    val title: String = "",
    @field:Schema(description = "타입", example = "worship", allowableValues = ["worship", "event", "new-family", "service", "prayer", "etc"])
    val type: String = "etc",
    @field:Schema(description = "시작일", example = "2026-08-15")
    val startDate: String = "",
    @field:Schema(description = "종료일(선택 — 여러 날 일정만)", example = "2026-08-16")
    val endDate: String = "",
    @field:Schema(description = "표시용 시각(선택)", example = "오전 6:00")
    val startTime: String = "",
    @field:Schema(description = "장소(선택)", example = "본당")
    val location: String = "",
)

data class ManualCalendarEventResponse(
    val id: String,
    val title: String,
    val type: String,
    val startDate: String,
    val endDate: String?,
    val startTime: String?,
    val location: String?,
    val createdBy: String,
    val createdAt: String,
)

fun ManualCalendarEvent.toResponse() = ManualCalendarEventResponse(
    id = id,
    title = title,
    type = type,
    startDate = startDate,
    endDate = endDate,
    startTime = startTime,
    location = location,
    createdBy = createdBy,
    createdAt = createdAt.toString(),
)
