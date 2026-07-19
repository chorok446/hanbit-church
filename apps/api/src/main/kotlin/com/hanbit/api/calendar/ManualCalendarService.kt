package com.hanbit.api.calendar

import com.hanbit.api.admin.AdminActionLogService
import com.hanbit.api.admin.AdminActionType
import com.hanbit.api.event.parseEventDate
import com.hanbit.api.security.AuthUser
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.util.UUID

@Service
class ManualCalendarService(
    private val repo: ManualCalendarEventRepository,
    private val actionLogs: AdminActionLogService,
    private val clock: Clock,
) {
    /** 공개 캘린더용 범위 조회. from/to 미지정이면 전체(수동 일정은 소량 전제). */
    @Transactional(readOnly = true)
    fun list(from: String?, to: String?): List<ManualCalendarEventResponse> {
        val events = if (from.isNullOrBlank() && to.isNullOrBlank()) {
            repo.findAllByOrderByStartDateAscIdAsc()
        } else {
            val fromDate = from?.takeIf { it.isNotBlank() }?.let { parseEventDate(it, "from").toString() } ?: "0000-01-01"
            val toDate = to?.takeIf { it.isNotBlank() }?.let { parseEventDate(it, "to").toString() } ?: "9999-12-31"
            repo.findOverlapping(fromDate, toDate)
        }
        return events.map { it.toResponse() }
    }

    @Transactional
    fun create(user: AuthUser, req: SaveManualCalendarEventRequest): ManualCalendarEventResponse {
        val input = normalize(req)
        return repo.save(
            ManualCalendarEvent(
                id = "mc-${UUID.randomUUID()}",
                title = input.title,
                type = input.type,
                startDate = input.startDate,
                endDate = input.endDate,
                startTime = input.startTime,
                location = input.location,
                createdBy = user.name,
                createdAt = Instant.now(clock),
            ),
        ).toResponse()
    }

    @Transactional
    fun update(user: AuthUser, id: String, req: SaveManualCalendarEventRequest): ManualCalendarEventResponse {
        val event = repo.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "calendar event $id not found")
        }
        val input = normalize(req)
        event.title = input.title
        event.type = input.type
        event.startDate = input.startDate
        event.endDate = input.endDate
        event.startTime = input.startTime
        event.location = input.location
        // 감사 추적 — 조치 주체(actor)를 append-only 로그에 남긴다(수정은 row snapshot 이 아니라 로그로 기록).
        actionLogs.record(user.id, AdminActionType.MANUAL_CALENDAR_UPDATED, "MANUAL_CALENDAR", id, input.title)
        return event.toResponse()
    }

    @Transactional
    fun delete(user: AuthUser, id: String) {
        val event = repo.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "calendar event $id not found")
        }
        // 하드 삭제라 row 에는 흔적이 안 남는다 — 삭제 전 제목과 조치 주체를 로그에 남긴다.
        actionLogs.record(user.id, AdminActionType.MANUAL_CALENDAR_DELETED, "MANUAL_CALENDAR", id, event.title)
        repo.delete(event)
    }

    private data class NormalizedInput(
        val title: String,
        val type: String,
        val startDate: String,
        val endDate: String?,
        val startTime: String?,
        val location: String?,
    )

    /** 생성·수정이 같은 검증 규칙을 쓴다 — trim, 필수·길이·타입·날짜 순서. */
    private fun normalize(req: SaveManualCalendarEventRequest): NormalizedInput {
        val title = req.title.trim()
        if (title.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required")
        if (title.length > 100) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title must not exceed 100 characters")

        val type = req.type.trim()
        if (type !in MANUAL_CALENDAR_TYPES) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be one of $MANUAL_CALENDAR_TYPES")
        }

        val startDate = parseEventDate(req.startDate, "startDate")
        val endDate = req.endDate.trim().takeIf { it.isNotBlank() }?.let { parseEventDate(it, "endDate") }
        if (endDate != null && endDate.isBefore(startDate)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate must be on or after startDate")
        }

        val startTime = req.startTime.trim().takeIf { it.isNotBlank() }
        if (startTime != null && startTime.length > 20) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "startTime must not exceed 20 characters")
        }
        val location = req.location.trim().takeIf { it.isNotBlank() }
        if (location != null && location.length > 100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "location must not exceed 100 characters")
        }

        return NormalizedInput(
            title = title,
            type = type,
            startDate = startDate.toString(),
            endDate = endDate?.toString(),
            startTime = startTime,
            location = location,
        )
    }
}
