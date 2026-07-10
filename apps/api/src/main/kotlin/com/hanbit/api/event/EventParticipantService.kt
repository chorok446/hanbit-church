package com.hanbit.api.event

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.security.AuthUser
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * 행사 참여 도메인 서비스. 참여/참여 취소, 참가자 목록/강제 퇴장 정책을 담당한다.
 * Controller 에서 옮겨온 참여 가능 검증, owner-only 검증, row lock, 알림 생성, 트랜잭션을 이 계층에 둔다.
 */
@Service
class EventParticipantService(
    private val repo: EventRepository,
    private val participants: EventParticipantRepository,
    private val bookmarkRepo: EventBookmarkRepository,
    private val users: UserRepository,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    /**
     * 행사 참여. 인증 필요. 신규 참여는 open·모집 기간·정원을 모두 검증한다.
     *
     * 동시성: 트랜잭션 안에서 행사 row 를 가장 먼저 write lock 으로 잡아, 같은 행사에 대한 요청을 직렬화한다.
     * 이렇게 하면 (1) 서로 다른 유저가 마지막 자리에 동시에 들어와도 capacity 를 넘지 않고,
     * (2) 같은 유저의 동시 요청도 lock 보유 중 existsBy 재확인으로 idempotent 하게 처리된다.
     * unique 제약은 최종 방어선으로 유지(rollback-only 예외를 삼켜 200 으로 위장하지 않는다).
     */
    @Transactional
    fun joinEvent(user: AuthUser, eventId: String): EventResponse {
        val today = LocalDate.now(clock)
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        // 숨김 행사는 신규 참여 불가(존재를 드러내지 않는 404). 참여 취소(leave)는 그대로 허용한다.
        if (event.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        // lock 보유 상태에서 재확인 → 같은 유저 동시 요청도 직렬화되어 idempotent.
        if (participants.existsByEventIdAndUserId(eventId, user.id)) {
            return event.toResponse(
                viewerId = user.id,
                joinedByMe = true,
                bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, user.id),
                today = today,
            )
        }
        if (event.status != "open") {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "event is not open")
        }
        val recruitment = event.recruitmentOn(today)
        if (!recruitment.validDates) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event recruit dates are invalid")
        }
        if (recruitment.state == EventRecruitState.BEFORE_RECRUIT) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event recruitment has not started")
        }
        if (recruitment.state == EventRecruitState.ENDED) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event recruitment has ended")
        }
        if (event.joined >= event.capacity) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event is full")
        }
        participants.save(EventParticipant("cp-${UUID.randomUUID()}", eventId, user.id))
        event.joined += 1
        repo.save(event)
        // 새 participant 가 실제로 생성된 경로에서만 알림 → 멱등 join(위 early return)은 중복 생성 안 함.
        notifications.notify(
            recipientUserId = event.authorUserId,
            actorUserId = user.id,
            type = NotificationType.EVENT_JOINED,
            title = "${user.name}님이 행사에 참여했습니다",
            body = event.title,
            href = "/events/$eventId/participants",
        )
        return event.toResponse(
            viewerId = user.id,
            joinedByMe = true,
            bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, user.id),
            today = today,
        )
    }

    /**
     * 행사 참여 취소. join 과 같은 event row lock 을 가장 먼저 잡아 참여·취소·마감을 직렬화한다.
     *
     * count 조회 후 감소하지 않고, 해당 사용자의 participant row 존재 여부만으로 정확히 한 번만 감소시킨다.
     * - participant 가 없으면 행사 상태와 무관하게 멱등 200(joinedByMe=false). 중복 취소도 추가 감소 없음.
     * - participant 가 있는데 open 이 아니면 409(마감 후 취소 불가, 비정상 upcoming participant 도 동일).
     * joined 는 0 미만으로 내려가지 않는다. 개설자가 직접 참여한 경우도 동일하게 처리한다.
     */
    /** 자리 알림 수신자 — 정원마감이었던 행사에서 자리가 났을 때, 미참여 북마커(이탈자·개설자 제외). */
    private fun seatNoticeRecipients(event: Event, excludeUserIds: Set<Long>): List<Long> {
        val participantIds = participants.findByEventId(event.id).map { it.userId }.toSet()
        val bookmarkerIds = bookmarkRepo.findByEventId(event.id)
            .map { it.userId }
            .filter { it !in participantIds && it !in excludeUserIds && it != event.authorUserId }
            .distinct()
        return users.findAllById(bookmarkerIds).filter { it.notifyEventUpdates }.mapNotNull { it.id }
    }

    /** 자리 알림 팬아웃 — leave/강제 퇴장 커밋(행 락 해제) 후 컨트롤러가 호출한다. best-effort. */
    @Transactional
    fun notifySeatOpened(actorUserId: Long, eventId: String, eventTitle: String, recipientIds: List<Long>) {
        recipientIds.forEach { recipientId ->
            notifications.notify(
                recipientUserId = recipientId,
                actorUserId = actorUserId,
                type = NotificationType.EVENT_CAPACITY_INCREASED,
                title = "자리가 생겼어요",
                body = "$eventTitle 행사에 자리가 생겼어요. 지금 참여할 수 있어요.",
                href = "/events/$eventId",
            )
        }
    }

    data class LeaveResult(val response: EventResponse, val seatNoticeRecipientIds: List<Long>, val eventTitle: String)

    data class RemovalResult(
        val response: EventParticipantRemovalResponse,
        val seatNoticeRecipientIds: List<Long>,
        val eventTitle: String,
    )

    @Transactional
    fun leaveEvent(userId: Long, eventId: String): LeaveResult {
        val today = LocalDate.now(clock)
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        val participant = participants.findByEventIdAndUserId(eventId, userId)
            ?: return LeaveResult(
                response = event.toResponse(
                    viewerId = userId,
                    joinedByMe = false,
                    bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, userId),
                    today = today,
                ),
                seatNoticeRecipientIds = emptyList(),
                eventTitle = event.title,
            )
        if (event.status != "open") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event is not open")
        }
        val wasFull = event.capacity > 0 && event.joined >= event.capacity
        participants.delete(participant)
        event.joined = maxOf(0, event.joined - 1)
        repo.save(event)
        return LeaveResult(
            response = event.toResponse(
                viewerId = userId,
                joinedByMe = false,
                bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, userId),
                today = today,
            ),
            seatNoticeRecipientIds = if (wasFull) seatNoticeRecipients(event, setOf(userId)) else emptyList(),
            eventTitle = event.title,
        )
    }

    /**
     * 참가자 명단 CSV(UTF-8 BOM — 엑셀 한글 호환). 개설자 전용(목록 API 와 같은 가드).
     * 담는 정보도 목록 API 와 동일하게 이름·인증 여부뿐 — 이메일 등 연락처는 앱 내 미노출
     * 정책(회원 열거 차단)을 내보내기에서도 유지한다.
     */
    @Transactional(readOnly = true)
    fun exportParticipantsCsv(ownerUserId: Long, eventId: String): EventParticipantsCsv {
        val event = repo.findById(eventId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.authorUserId == null || event.authorUserId != ownerUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }
        val all = participants.findByEventId(eventId, Sort.by("userId").ascending().and(Sort.by("id").ascending()))
        val usersById = if (all.isEmpty()) {
            emptyMap()
        } else {
            users.findAllById(all.map { it.userId }.distinct()).associateBy { requireNotNull(it.id) }
        }
        val lines = buildList {
            add(listOf("번호", "이름", "인증"))
            all.forEachIndexed { index, participant ->
                val participantUser = usersById[participant.userId]
                add(
                    listOf(
                        (index + 1).toString(),
                        participantUser?.name ?: "탈퇴한 사용자",
                        if (participantUser?.verified == true) "인증" else "",
                    ),
                )
            }
        }
        val csv = lines.joinToString("\r\n") { row -> row.joinToString(",") { escapeCsvField(it) } }
        return EventParticipantsCsv(
            filename = "participants-${event.id}.csv",
            bytes = UTF8_BOM + csv.toByteArray(Charsets.UTF_8),
        )
    }

    /**
     * 쉼표·따옴표·줄바꿈이 든 필드는 따옴표로 감싸고 내부 따옴표는 이중화한다(RFC 4180).
     * 수식 시작 문자(= + - @, 탭)는 작은따옴표를 앞에 붙여 무력화한다 — 이름을 "=HYPERLINK(...)"
     * 로 지어 명단을 연 관리자의 엑셀에서 수식이 실행되는 CSV 인젝션을 막는다(OWASP 권고).
     */
    private fun escapeCsvField(value: String): String {
        val neutralized = if (value.firstOrNull() in FORMULA_PREFIXES) "'$value" else value
        return if (neutralized.any { it == ',' || it == '"' || it == '\n' || it == '\r' }) {
            "\"" + neutralized.replace("\"", "\"\"") + "\""
        } else {
            neutralized
        }
    }

    /** 개설자용 참가자 목록. 참가자 page와 사용자 bulk 조회만 수행하며 event row lock은 사용하지 않는다. */
    @Transactional(readOnly = true)
    fun getParticipants(ownerUserId: Long, eventId: String, page: Int, size: Int): EventParticipantsResponse {
        checkPageParams(page, size, MAX_PARTICIPANT_PAGE_SIZE)

        val event = repo.findById(eventId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.authorUserId == null || event.authorUserId != ownerUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }

        val participantPage = participants.findByEventId(
            eventId,
            PageRequest.of(page, size, Sort.by("userId").ascending().and(Sort.by("id").ascending())),
        )
        val userIds = participantPage.content.map { it.userId }.distinct()
        val usersById = if (userIds.isEmpty()) {
            emptyMap()
        } else {
            users.findAllById(userIds).associateBy { requireNotNull(it.id) }
        }

        return EventParticipantsResponse(
            eventId = event.id,
            title = event.title,
            status = event.status,
            capacity = event.capacity,
            joined = event.joined,
            page = participantPage.number,
            size = participantPage.size,
            totalElements = participantPage.totalElements,
            totalPages = participantPage.totalPages,
            participants = participantPage.content.map { participant ->
                val participantUser = usersById[participant.userId]
                EventParticipantResponse(
                    participantId = participant.id,
                    name = participantUser?.name ?: "탈퇴한 사용자",
                    verified = participantUser?.verified ?: false,
                )
            },
        )
    }

    /**
     * 개설자용 참가자 강제 퇴장. open 행사에서만, 개설자만 가능.
     *
     * 잠금 순서는 join/leave/status/delete 와 동일하게 event row write lock 을 가장 먼저 잡아
     * 같은 행사의 참여·취소·마감·삭제·강제퇴장을 직렬화한다. participant row 존재 여부만으로
     * joined 를 정확히 한 번만 감소시키며(0 미만 방지), 제거된 사용자에게 같은 트랜잭션에서 알림을 만든다.
     * - 행사 없음 404, 비개설자/레거시(authorUserId=null) 403, open 아니면 409, participant 없음 404.
     */
    @Transactional
    fun removeParticipant(ownerUserId: Long, eventId: String, participantId: String): RemovalResult {
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.authorUserId == null || event.authorUserId != ownerUserId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }
        if (event.status != "open") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event is not open")
        }
        // 다른 행사의 participantId 거나 이미 제거됐으면 null → 404. 상태 검사 뒤라 status 를 비개설자에게 노출하지 않는다.
        val participant = participants.findByIdAndEventId(participantId, eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "participant $participantId not found")

        val wasFull = event.capacity > 0 && event.joined >= event.capacity
        participants.delete(participant)
        event.joined = maxOf(0, event.joined - 1)
        repo.save(event)
        // 제거된 사용자에게 알림(개설자가 자기 자신을 제거한 경우에도 생성).
        notifications.notifyUser(
            recipientUserId = participant.userId,
            type = NotificationType.EVENT_PARTICIPATION_REMOVED,
            title = "참여 중인 행사에서 제외되었습니다",
            body = event.title,
            href = "/events/$eventId",
        )
        return RemovalResult(
            response = EventParticipantRemovalResponse(
                eventId = eventId,
                participantId = participantId,
                removed = true,
                joined = event.joined,
            ),
            // 제거된 사용자는 자리 알림 대상이 아니다(방금 빠진 본인).
            seatNoticeRecipientIds = if (wasFull) seatNoticeRecipients(event, setOf(participant.userId)) else emptyList(),
            eventTitle = event.title,
        )
    }

    private companion object {
        /** 스프레드시트가 수식으로 해석하는 선행 문자 — escapeCsvField 에서 무력화한다. */
        val FORMULA_PREFIXES = setOf('=', '+', '-', '@', '\t')

        /** 엑셀이 UTF-8 CSV 를 한글 그대로 열도록 붙이는 BOM. */
        val UTF8_BOM = byteArrayOf(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte())

        const val MAX_PARTICIPANT_PAGE_SIZE = 100
    }
}
