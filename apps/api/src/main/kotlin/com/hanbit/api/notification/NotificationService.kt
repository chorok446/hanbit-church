package com.hanbit.api.notification

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.common.checkPageParams
import org.springframework.context.ApplicationEventPublisher
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

/**
 * 알림 생성 도메인 이벤트. 수신자가 접속 중이면 WS 로 배지를 갱신하기 위해 발행한다
 * (구독은 message 패키지의 NotificationWsPusher — 커밋 후에만 push 되어 롤백된 알림은 새지 않는다).
 */
data class NotificationCreatedEvent(val recipientUserId: Long)

/**
 * 알림 도메인 서비스. 두 가지 책임을 가진다.
 * 1) 도메인 이벤트(댓글/참여)에서 호출되는 알림 생성 helper. 호출자 트랜잭션에 참여한다(notify/notifyUser).
 * 2) 알림 조회/읽음/삭제 비즈니스 정책. Controller 에서 옮겨온 검증·트랜잭션·소유권 확인을 담당한다.
 */
@Service
class NotificationService(
    private val repo: NotificationRepository,
    private val users: UserRepository,
    private val events: ApplicationEventPublisher,
) {

    @Transactional(readOnly = true)
    fun getNotifications(
        userId: Long,
        page: Int,
        size: Int,
        unreadOnly: Boolean,
        types: List<String> = emptyList(),
    ): NotificationsResponse {
        validatePageable(page, size)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("seq"), Sort.Order.asc("id")))
        val result = when {
            types.isNotEmpty() && unreadOnly -> repo.findByUserIdAndTypeInAndReadAtIsNull(userId, types, pageable)
            types.isNotEmpty() -> repo.findByUserIdAndTypeIn(userId, types, pageable)
            unreadOnly -> repo.findByUserIdAndReadAtIsNull(userId, pageable)
            else -> repo.findByUserId(userId, pageable)
        }
        return NotificationsResponse(
            content = result.content.map { it.toResponse() },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            unreadCount = repo.countByUserIdAndReadAtIsNull(userId),
        )
    }

    @Transactional(readOnly = true)
    fun getUnreadCount(userId: Long): NotificationUnreadCountResponse =
        NotificationUnreadCountResponse(repo.countByUserIdAndReadAtIsNull(userId))

    @Transactional
    fun markAsRead(userId: Long, notificationId: String): NotificationResponse {
        val notification = ownedOrNotFound(userId, notificationId)
        if (notification.readAt == null) notification.readAt = Instant.now()
        return notification.toResponse()
    }

    @Transactional
    fun markAllAsRead(userId: Long): NotificationReadAllResponse {
        val updated = repo.markAllRead(userId, Instant.now())
        return NotificationReadAllResponse(updatedCount = updated.toLong(), unreadCount = 0)
    }

    @Transactional
    fun deleteNotification(userId: Long, notificationId: String): NotificationDeleteResponse {
        repo.delete(ownedOrNotFound(userId, notificationId))
        return NotificationDeleteResponse(deleted = true, unreadCount = repo.countByUserIdAndReadAtIsNull(userId))
    }

    @Transactional
    fun deleteReadNotifications(userId: Long): NotificationDeleteReadResponse {
        val deleted = repo.deleteReadByUserId(userId)
        return NotificationDeleteReadResponse(
            deletedCount = deleted.toLong(),
            unreadCount = repo.countByUserIdAndReadAtIsNull(userId),
        )
    }

    private fun ownedOrNotFound(userId: Long, notificationId: String): Notification =
        repo.findByIdAndUserId(notificationId, userId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "notification $notificationId not found")

    private fun validatePageable(page: Int, size: Int) = checkPageParams(page, size, MAX_PAGE_SIZE)

    /**
     * 알림 생성 helper. 도메인 이벤트(댓글/참여) 트랜잭션 안에서 호출되어 같은 트랜잭션에 참여한다.
     * 수신자가 없거나 actor==receiver 이거나 수신자가 해당 유형을 꺼 뒀으면 생성하지 않는다.
     * 그 외에는 저장하며, DB 제약 위반은 삼키지 않는다.
     */
    fun notify(
        recipientUserId: Long?,
        actorUserId: Long,
        type: String,
        title: String,
        body: String,
        href: String,
    ) {
        if (recipientUserId == null || recipientUserId == actorUserId) return
        if (mutedByPreference(recipientUserId, type)) return
        notifyUser(recipientUserId, type, title, body, href)
    }

    /**
     * 수신자의 유형별 알림 설정. 댓글류·좋아요만 뮤트 가능하다 — 보안(새 기기 로그인)·운영(숨김/신고
     * 처리)·행사 강제 퇴장은 notifyUser 경로라 이 게이트를 타지 않고, 행사 상태 알림(notifyEventUpdates)은
     * 팬아웃 시점에 bulk 로드로 필터링돼 여기서 다시 확인하지 않는다.
     */
    private fun mutedByPreference(recipientUserId: Long, type: String): Boolean {
        val muteable = type in COMMENT_NOTIFICATION_TYPES || type == NotificationType.POST_LIKED
        if (!muteable) return false
        val recipient = users.findById(recipientUserId).orElse(null) ?: return false
        return when (type) {
            in COMMENT_NOTIFICATION_TYPES -> !recipient.notifyComments
            else -> !recipient.notifyLikes
        }
    }

    /**
     * 수신자에게 직접 알림 생성(actor==receiver 여부와 무관). 강제 퇴장처럼 본인에게도 알려야 하는 경우에 쓴다.
     * 같은 트랜잭션에 참여하며 DB 제약 위반은 삼키지 않는다.
     */
    fun notifyUser(
        recipientUserId: Long,
        type: String,
        title: String,
        body: String,
        href: String,
    ) {
        repo.save(
            Notification(
                id = "noti-${UUID.randomUUID()}",
                userId = recipientUserId,
                type = type,
                title = title,
                body = body.trim().take(MAX_BODY),
                href = href,
                readAt = null,
                createdAt = Instant.now(),
                time = "방금 전",
                // 정렬 키는 벽시계(epoch millis) 기반이어야 재기동·다중 replica 간에도 일관된 최신순이 유지된다.
                // (System.nanoTime 은 JVM 로컬 기준점이라 재기동/replica 마다 값이 어긋난다.)
                seq = Instant.now().toEpochMilli(),
            ),
        )
        events.publishEvent(NotificationCreatedEvent(recipientUserId))
    }

    private companion object {
        const val MAX_BODY = 200
        const val MAX_PAGE_SIZE = 100
        val COMMENT_NOTIFICATION_TYPES = setOf(
            NotificationType.POST_COMMENT_CREATED,
            NotificationType.COMMENT_REPLY_CREATED,
            NotificationType.COMMENT_MENTIONED,
            NotificationType.EVENT_COMMENT_CREATED,
        )
    }
}
