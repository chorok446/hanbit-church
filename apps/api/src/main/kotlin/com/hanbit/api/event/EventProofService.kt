package com.hanbit.api.event

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.findActiveOrThrow
import com.hanbit.api.auth.toAuthorSnapshot
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.post.normalizeImages
import com.hanbit.api.security.AuthUser
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * 행사 참여 후기(후기) 도메인 서비스. 목록/작성/삭제 정책을 담당한다.
 * 작성은 참여자만, 모집 시작(upcoming 이후)부터, 1인 1인증. 개설자에게 알림을 보낸다.
 */
@Service
class EventProofService(
    private val events: EventRepository,
    private val proofs: EventProofRepository,
    private val participants: EventParticipantRepository,
    private val users: UserRepository,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun listProofs(eventId: String, currentUserId: Long?, page: Int, size: Int): EventProofsResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        requireViewableEvent(eventId, currentUserId)

        val result = proofs.findByEventIdAndHiddenAtIsNull(
            eventId,
            PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")),
            ),
        )
        return EventProofsResponse(
            content = result.content.map { it.toResponse(currentUserId) },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            proofedByMe = currentUserId != null &&
                proofs.existsByEventIdAndAuthorUserId(eventId, currentUserId),
        )
    }

    @Transactional
    fun createProof(user: AuthUser, eventId: String, request: CreateEventProofRequest): EventProofResponse {
        val text = request.text.trim()
        if (text.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required")
        }
        if (text.length > MAX_TEXT_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "text must not exceed $MAX_TEXT_LENGTH characters")
        }
        val images = normalizeImages(request.images)

        // 행사 삭제와 같은 row 를 첫 DB 조회로 잠가 orphan proof 생성을 막는다.
        val event = events.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.status == "upcoming") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event has not started")
        }
        if (!participants.existsByEventIdAndUserId(eventId, user.id)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not a event participant")
        }
        if (proofs.existsByEventIdAndAuthorUserId(eventId, user.id)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "proof already exists")
        }

        val authorSnapshot = users.findActiveOrThrow(user.id).toAuthorSnapshot()
        val saved = proofs.save(
            EventProof(
                id = "cpr-${UUID.randomUUID()}",
                eventId = eventId,
                author = authorSnapshot,
                text = text,
                images = images,
                createdAt = Instant.now(clock),
                authorUserId = user.id,
            ),
        )
        // 내 행사에 타인이 인증 → 개설자에게 알림(본인 인증/개설자 미상은 helper 가 생략).
        notifications.notify(
            recipientUserId = event.authorUserId,
            actorUserId = user.id,
            type = NotificationType.EVENT_PROOF_CREATED,
            title = "${authorSnapshot.name}님이 행사 참여를 인증했습니다",
            body = event.title,
            href = "/events/$eventId?tab=proofs",
        )
        return saved.toResponse(user.id)
    }

    @Transactional
    fun deleteProof(userId: Long, eventId: String, proofId: String) {
        // 작성·행사 삭제와 lock 순서를 맞추기 위해 event row 를 가장 먼저 잠근다.
        events.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        val proof = proofs.findByIdAndEventId(proofId, eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "proof $proofId not found")
        // 숨김 인증은 작성자에게도 존재를 드러내지 않는다.
        if (proof.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "proof $proofId not found")
        }
        if (proof.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the proof owner")
        }
        proofs.delete(proof)
    }

    /** 공개 조회 경로에서 행사 존재·노출 여부 확인. 숨김 행사는 개설자에게만 보이고, 삭제는 모두에게 404. */
    private fun requireViewableEvent(eventId: String, currentUserId: Long?) {
        val event = events.findById(eventId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.hiddenAt != null && (event.authorUserId == null || event.authorUserId != currentUserId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
    }

    private companion object {
        const val MAX_PAGE_SIZE = 100
        const val MAX_TEXT_LENGTH = 500
    }
}
