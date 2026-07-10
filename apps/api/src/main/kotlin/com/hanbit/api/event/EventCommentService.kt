package com.hanbit.api.event

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.findActiveOrThrow
import com.hanbit.api.auth.toAuthorSnapshot
import com.hanbit.api.common.CommentPageLocationResponse
import com.hanbit.api.common.ListingLimits.MAX_COMMENT_PAGE_SIZE as MAX_PAGE_SIZE
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.common.checkPageSize
import com.hanbit.api.notification.CommentMentionNotifier
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
import java.time.Instant
import java.util.UUID

/**
 * 행사 댓글 도메인 서비스. 댓글 목록/pagination/딥링크 위치 조회와 작성/수정/삭제 정책을 담당한다.
 * Controller 에서 옮겨온 validation, 소유권 검증, row lock, 알림 생성, 트랜잭션을 이 계층에 둔다.
 */
@Service
class EventCommentService(
    private val events: EventRepository,
    private val comments: EventCommentRepository,
    private val users: UserRepository,
    private val notifications: NotificationService,
    private val mentions: CommentMentionNotifier,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun listComments(eventId: String, currentUserId: Long?, page: Int, size: Int): EventCommentsResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        requireViewableEvent(eventId, currentUserId)

        val result = comments.findByEventIdAndParentIdIsNullAndHiddenAtIsNull(
            eventId,
            PageRequest.of(
                page,
                size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")),
            ),
        )
        val parentIds = result.content.map { it.id }
        val repliesByParent = if (parentIds.isEmpty()) {
            emptyMap()
        } else {
            comments.findByParentIdInAndHiddenAtIsNullOrderByCreatedAtAscIdAsc(parentIds).groupBy { it.parentId }
        }
        return EventCommentsResponse(
            content = result.content.map { comment ->
                comment.toResponse(
                    currentUserId,
                    replies = (repliesByParent[comment.id] ?: emptyList()).map { it.toResponse(currentUserId) },
                )
            },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            totalComments = comments.countByEventIdAndHiddenAtIsNull(eventId),
        )
    }

    /** 최신순 댓글 pagination과 같은 정렬 기준으로 대상 댓글이 속한 page를 계산한다. */
    @Transactional(readOnly = true)
    fun getCommentPageLocation(eventId: String, commentId: String, size: Int): CommentPageLocationResponse {
        checkPageSize(size, MAX_PAGE_SIZE)
        requireExistingEvent(eventId)
        val target = comments.findByIdAndEventId(commentId, eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        if (target.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        }
        // 답글은 최상위 부모의 page 에 함께 표시되므로 부모 기준으로 위치를 계산한다.
        val anchor = target.parentId?.let { parentId ->
            val parent = comments.findByIdAndEventId(parentId, eventId)
            if (parent == null || parent.hiddenAt != null) {
                throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
            }
            parent
        } ?: target
        val commentsBefore = comments.countBeforeInNewestOrder(eventId, anchor.createdAt, anchor.id)
        return CommentPageLocationResponse(
            commentId = target.id,
            page = (commentsBefore / size).toInt(),
            size = size,
        )
    }

    @Transactional
    fun createComment(user: AuthUser, eventId: String, request: CreateEventCommentRequest): EventCommentResponse {
        val text = normalizeEventCommentText(request.text)
        // 행사 삭제와 같은 row를 첫 DB 조회로 잠가 orphan comment 생성을 막는다.
        val event = events.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        // 숨김 행사에는 새 댓글을 받지 않는다(개설자 포함).
        if (event.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }

        // 답글이면 부모가 같은 행사의 노출 중인 최상위 댓글인지 확인한다(1단계 제한).
        val parent = request.parentId?.let { parentId ->
            val found = comments.findByIdAndEventId(parentId, eventId)
            if (found == null || found.hiddenAt != null) {
                throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $parentId not found")
            }
            if (found.parentId != null) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot reply to a reply")
            }
            found
        }
        val authorSnapshot = users.findActiveOrThrow(user.id).toAuthorSnapshot()
        val saved = comments.save(
            EventComment(
                id = "cc-${UUID.randomUUID()}",
                eventId = eventId,
                author = authorSnapshot,
                text = text,
                createdAt = Instant.now(clock),
                authorUserId = user.id,
                parentId = parent?.id,
            ),
        )
        if (parent != null) {
            // 답글은 부모 댓글 작성자에게 알린다(본인 답글/작성자 미상은 helper 가 생략).
            notifications.notify(
                recipientUserId = parent.authorUserId,
                actorUserId = user.id,
                type = NotificationType.COMMENT_REPLY_CREATED,
                title = "${authorSnapshot.name}님이 내 댓글에 답글을 남겼습니다",
                body = text,
                href = "/events/$eventId?commentId=${saved.id}",
            )
        } else {
            // 내가 개설한 행사에 타인이 댓글 → 개설자에게 알림(본인 댓글/개설자 미상은 helper 가 생략).
            notifications.notify(
                recipientUserId = event.authorUserId,
                actorUserId = user.id,
                type = NotificationType.EVENT_COMMENT_CREATED,
                title = "${authorSnapshot.name}님이 행사에 댓글을 남겼습니다",
                body = event.title,
                href = "/events/$eventId?commentId=${saved.id}",
            )
        }
        // @멘션된 사용자에게 알림. 위에서 이미 댓글/답글 알림을 받은 수신자는 제외해 중복을 막는다.
        mentions.notifyMentions(
            text = text,
            actorUserId = user.id,
            actorName = authorSnapshot.name,
            href = "/events/$eventId?commentId=${saved.id}",
            excludeUserIds = setOfNotNull(parent?.authorUserId ?: event.authorUserId),
        )
        return saved.toResponse(user.id)
    }

    /** 댓글 수정은 생성 시각과 정렬을 유지하고 text와 updatedAt만 갱신한다. */
    @Transactional
    fun updateComment(userId: Long, eventId: String, commentId: String, request: UpdateEventCommentRequest): EventCommentResponse {
        requireExistingEvent(eventId)
        val comment = comments.findByIdAndEventId(commentId, eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        // 숨김 댓글은 작성자에게도 수정 불가(존재를 드러내지 않는 404).
        if (comment.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        }
        if (comment.authorUserId == null || comment.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the comment owner")
        }
        comment.text = normalizeEventCommentText(request.text)
        comment.updatedAt = Instant.now(clock)
        return comment.toResponse(userId)
    }

    @Transactional
    fun deleteComment(userId: Long, eventId: String, commentId: String) {
        // 작성·행사 삭제와 lock 순서를 맞추기 위해 event row를 가장 먼저 잠근다.
        val event = events.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        val comment = comments.findByIdAndEventId(commentId, eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        if (comment.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "comment $commentId not found")
        }
        if (comment.authorUserId == null || comment.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the comment owner")
        }
        // soft delete: row 는 남기고 deletedAt/hiddenAt 을 마킹한다(신고 대상 보존).
        // 최상위 댓글 삭제 시 답글도 함께 삭제 처리한다.
        val replies = if (comment.parentId == null) {
            comments.findByParentId(comment.id).filter { it.deletedAt == null }
        } else {
            emptyList()
        }
        val now = Instant.now(clock)
        (replies + comment).forEach {
            it.deletedAt = now
            if (it.hiddenAt == null) it.hiddenAt = now
        }
    }

    /** 행사 존재 확인. 삭제(soft delete)된 행사는 존재하지 않는 것으로 취급한다. */
    private fun requireExistingEvent(eventId: String) {
        val event = events.findById(eventId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
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

}
