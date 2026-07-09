package com.dasida.api.praise

import com.dasida.api.notification.NotificationService
import com.dasida.api.notification.NotificationType
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.Locale
import java.util.UUID

/**
 * 찬양팀 일정 서비스. 쓰기는 콘티와 동일하게 리더+사이트 ADMIN.
 * 조회는 세 층:
 * - 멤버 목록(getSchedules): 찬양팀 멤버·ADMIN — PRIVATE 포함 전체.
 * - 공개 목록(getPublicSchedules): 요청자에 따라 층이 결정된다 —
 *   찬양팀 멤버·ADMIN = 전체(PRIVATE 포함), 로그인 교인 = CHURCH+PUBLIC, 비로그인 = PUBLIC.
 *   교회 캘린더(campaign-calendar/home-weekly-schedule)는 이 엔드포인트 하나만 호출하면 된다.
 */
@Service
class PraiseScheduleService(
    private val schedules: PraiseScheduleRepository,
    private val setlists: PraiseSetlistRepository,
    private val assignments: PraiseAssignmentRepository,
    private val access: PraiseAccess,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getSchedules(requesterId: Long, includePast: Boolean): List<PraiseScheduleResponse> {
        access.requireMember(requesterId)
        val rows = if (includePast) {
            schedules.findAll().sortedBy { it.startAt }
        } else {
            schedules.findByStartAtGreaterThanEqualOrderByStartAtAsc(startOfToday())
        }
        return rows.toResponses()
    }

    /** 공개 캘린더용. requesterId == null 은 비로그인. 403 없이 보이는 범위만 좁힌다. */
    @Transactional(readOnly = true)
    fun getPublicSchedules(requesterId: Long?): List<PraiseScheduleResponse> {
        val from = startOfToday()
        val rows = when {
            access.isMember(requesterId) ->
                schedules.findByStartAtGreaterThanEqualOrderByStartAtAsc(from)
            requesterId != null ->
                schedules.findByVisibilityInAndStartAtGreaterThanEqualOrderByStartAtAsc(
                    listOf(PraiseScheduleVisibility.CHURCH.name, PraiseScheduleVisibility.PUBLIC.name),
                    from,
                )
            else ->
                schedules.findByVisibilityInAndStartAtGreaterThanEqualOrderByStartAtAsc(
                    listOf(PraiseScheduleVisibility.PUBLIC.name),
                    from,
                )
        }
        return rows.toResponses()
    }

    @Transactional
    fun create(requesterId: Long, request: SavePraiseScheduleRequest): PraiseScheduleResponse {
        access.requireLeader(requesterId)
        val now = Instant.now(clock)
        val schedule = PraiseSchedule(
            id = "psch-${UUID.randomUUID()}",
            title = "",
            startAt = now,
            createdAt = now,
            updatedAt = now,
        )
        applyRequest(schedule, request)
        return schedules.save(schedule).toResponse(setlistTitle(schedule.setlistId))
    }

    @Transactional
    fun update(requesterId: Long, id: String, request: SavePraiseScheduleRequest): PraiseScheduleResponse {
        access.requireLeader(requesterId)
        val schedule = findSchedule(id)
        val prevStart = schedule.startAt
        val prevLocation = schedule.location
        applyRequest(schedule, request)
        schedule.updatedAt = Instant.now(clock)
        // 시각·장소가 바뀌면 연결 콘티 배정자에게 변경 알림.
        // 범위 판단: 연결 콘티가 있으면 그 콘티 배정자에게만 보낸다(연습·리허설은 배정된 이들에게만 유의미).
        // 콘티 미연결 일정(전체 공지성)은 대상이 모호해 자동 알림을 보내지 않는다 — 필요하면 공지로 안내.
        val timeChanged = prevStart != schedule.startAt
        val placeChanged = prevLocation?.trim() != schedule.location?.trim()
        if ((timeChanged || placeChanged) && schedule.setlistId != null) {
            notifyScheduleChange(schedule, actorUserId = requesterId)
        }
        return schedule.toResponse(setlistTitle(schedule.setlistId))
    }

    /** 연결 콘티 배정자에게 일정 변경 알림. 알림을 발생시킨 리더 본인은 notify 규칙상 제외. */
    private fun notifyScheduleChange(schedule: PraiseSchedule, actorUserId: Long) {
        val setlistId = schedule.setlistId ?: return
        val recipients = assignments.findBySetlistId(setlistId).map { it.userId }.distinct()
        val whenLabel = schedule.startAt.atZone(SEOUL).format(WHEN_FORMAT)
        val where = schedule.location?.let { " · $it" } ?: ""
        recipients.forEach { userId ->
            notifications.notify(
                recipientUserId = userId,
                actorUserId = actorUserId,
                type = NotificationType.PRAISE_SCHEDULE_CHANGED,
                title = "찬양팀 일정이 변경되었습니다",
                body = "${schedule.title} 일정이 변경되었습니다 — $whenLabel$where",
                href = "/praise-team/schedule",
            )
        }
    }

    @Transactional
    fun delete(requesterId: Long, id: String) {
        access.requireLeader(requesterId)
        schedules.delete(findSchedule(id))
    }

    // ─── 내부 ───

    private fun findSchedule(id: String): PraiseSchedule =
        schedules.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "schedule $id not found")
        }

    private fun applyRequest(schedule: PraiseSchedule, request: SavePraiseScheduleRequest) {
        val title = request.title.trim()
        if (title.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required")
        if (title.length > MAX_TITLE) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is too long")
        val type = parseEnum<PraiseScheduleType>(request.type) {
            "type must be one of ${PraiseScheduleType.entries.joinToString("/")}"
        }
        val visibility = parseEnum<PraiseScheduleVisibility>(request.visibility) {
            "visibility must be one of ${PraiseScheduleVisibility.entries.joinToString("/")}"
        }
        val startAt = parseInstant(request.startAt, "startAt")
        val endAt = request.endAt?.trim()?.takeIf { it.isNotEmpty() }?.let { parseInstant(it, "endAt") }
        if (endAt != null && !endAt.isAfter(startAt)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "endAt must be after startAt")
        }
        val memo = request.memo?.trim()?.ifEmpty { null }
        if (memo != null && memo.length > MAX_MEMO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "memo must not exceed $MAX_MEMO characters")
        }
        val setlistId = request.setlistId?.trim()?.ifEmpty { null }
        if (setlistId != null && !setlists.existsById(setlistId)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "setlist $setlistId not found")
        }

        schedule.title = title
        schedule.type = type.name
        schedule.startAt = startAt
        schedule.endAt = endAt
        schedule.location = request.location?.trim()?.ifEmpty { null }
        schedule.memo = memo
        schedule.visibility = visibility.name
        schedule.setlistId = setlistId
    }

    private fun parseInstant(raw: String, field: String): Instant =
        try {
            Instant.parse(raw.trim())
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "$field must be an ISO-8601 instant")
        }

    private inline fun <reified E : Enum<E>> parseEnum(raw: String, message: () -> String): E =
        runCatching { java.lang.Enum.valueOf(E::class.java, raw.trim()) }.getOrElse {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, message())
        }

    /** 오늘 0시(clock 타임존) — "다가오는 일정" 기준. 오늘 이미 지난 시각의 일정도 당일엔 계속 보인다. */
    private fun startOfToday(): Instant = LocalDate.now(clock).atStartOfDay(clock.zone).toInstant()

    /** 연결 콘티 제목 단건 조회(표시용). 없거나 삭제됐으면 null. */
    private fun setlistTitle(setlistId: String?): String? =
        setlistId?.let { setlists.findById(it).map { s -> s.title }.orElse(null) }

    /** 목록용 — 연결 콘티 제목을 한 번에 배치 조회해 N+1 을 피한다. */
    private fun List<PraiseSchedule>.toResponses(): List<PraiseScheduleResponse> {
        val ids = mapNotNull { it.setlistId }.distinct()
        val titles = if (ids.isEmpty()) emptyMap() else setlists.findAllById(ids).associate { it.id to it.title }
        return map { it.toResponse(titles[it.setlistId]) }
    }

    private fun PraiseSchedule.toResponse(setlistTitle: String?) = PraiseScheduleResponse(
        id = id,
        title = title,
        type = type,
        startAt = startAt.toString(),
        endAt = endAt?.toString(),
        location = location,
        memo = memo,
        visibility = visibility,
        setlistId = setlistId,
        setlistTitle = setlistTitle,
        createdAt = createdAt.toString(),
        updatedAt = updatedAt.toString(),
    )

    private companion object {
        const val MAX_TITLE = 100
        const val MAX_MEMO = 500
        val SEOUL: ZoneId = ZoneId.of("Asia/Seoul")
        val WHEN_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("M월 d일 (E) a h:mm", Locale.KOREAN)
    }
}
