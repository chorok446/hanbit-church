package com.hanbit.api.admin

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.event.EventCommentRepository
import com.hanbit.api.event.EventProofRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostCommentRepository
import com.hanbit.api.post.PostRepository
import com.hanbit.api.post.SCHEDULED_HIDDEN_REASON
import com.hanbit.api.report.ReportTargetType
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant

/**
 * 관리자 콘텐츠 숨김/복구 서비스. 삭제 대신 soft hide(hiddenAt)를 써서 처리 실수를 되돌릴 수 있게 한다.
 * 숨김/복구가 실제로 상태를 바꾼 경우에만 작성자에게 알림을 보낸다(멱등 재요청은 무음).
 * 게시글 댓글은 post.comments 카운터와 정합을 맞춘다(숨김 시 감소, 복구 시 증가).
 */
@Service
class AdminContentService(
    private val posts: PostRepository,
    private val postComments: PostCommentRepository,
    private val events: EventRepository,
    private val eventComments: EventCommentRepository,
    private val eventProofs: EventProofRepository,
    private val users: UserRepository,
    private val notifications: NotificationService,
    private val actionLogs: AdminActionLogService,
    private val clock: Clock,
) {
    /** 관리자 콘텐츠 목록 — 게시글/행사, 숨김 포함(hiddenOnly 로 숨김만), q 로 본문·제목/작성자 검색. 최신순. */
    @Transactional(readOnly = true)
    fun listContent(typeRaw: String, hiddenOnly: Boolean, page: Int, size: Int, q: String? = null): AdminContentPageResponse {
        com.hanbit.api.common.checkPageParams(page, size, MAX_LIST_PAGE_SIZE)
        val pageable = org.springframework.data.domain.PageRequest.of(page, size)
        val keyword = q?.trim()?.takeIf { it.isNotEmpty() }
        return when (typeRaw.trim().uppercase()) {
            "POST" -> {
                val result = when {
                    hiddenOnly && keyword != null ->
                        posts.findByHiddenAtIsNotNullAndTextContainingIgnoreCaseOrderBySeqDesc(keyword, pageable)
                    hiddenOnly -> posts.findByHiddenAtIsNotNullOrderBySeqDesc(pageable)
                    keyword != null ->
                        posts.findByTextContainingIgnoreCaseOrAuthorNameContainingIgnoreCaseOrderBySeqDesc(keyword, keyword, pageable)
                    else -> posts.findAllByOrderBySeqDesc(pageable)
                }
                AdminContentPageResponse(
                    content = result.content.map {
                        AdminContentItemResponse(
                            targetType = ReportTargetType.POST.name,
                            id = it.id,
                            title = it.text.take(TITLE_PREVIEW_LENGTH).ifBlank { "(본문 없음)" },
                            category = it.category,
                            authorName = it.author.name,
                            hidden = it.hiddenAt != null,
                            hiddenReason = it.hiddenReason,
                            deleted = it.deletedAt != null,
                        )
                    },
                    page = result.number, size = result.size,
                    totalElements = result.totalElements, totalPages = result.totalPages,
                )
            }
            "EVENT" -> {
                val result = when {
                    hiddenOnly && keyword != null ->
                        events.findByHiddenAtIsNotNullAndTitleContainingIgnoreCaseOrderBySeqDesc(keyword, pageable)
                    hiddenOnly -> events.findByHiddenAtIsNotNullOrderBySeqDesc(pageable)
                    keyword != null ->
                        events.findByTitleContainingIgnoreCaseOrAuthorNameContainingIgnoreCaseOrderBySeqDesc(keyword, keyword, pageable)
                    else -> events.findAllByOrderBySeqDesc(pageable)
                }
                AdminContentPageResponse(
                    content = result.content.map {
                        AdminContentItemResponse(
                            targetType = ReportTargetType.EVENT.name,
                            id = it.id,
                            title = it.title,
                            category = it.status,
                            authorName = it.author.name,
                            hidden = it.hiddenAt != null,
                            hiddenReason = it.hiddenReason,
                            deleted = it.deletedAt != null,
                        )
                    },
                    page = result.number, size = result.size,
                    totalElements = result.totalElements, totalPages = result.totalPages,
                )
            }
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be POST or EVENT")
        }
    }

    @Transactional
    fun setVisibility(
        adminUserId: Long,
        targetTypeRaw: String,
        targetId: String,
        request: SetContentVisibilityRequest,
    ): ContentVisibilityResponse {
        val targetType = try {
            ReportTargetType.valueOf(targetTypeRaw.trim())
        } catch (_: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid content target type")
        }
        val reason = request.reason?.trim()?.ifEmpty { null }
        if (reason != null && reason.length > MAX_REASON_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "reason must not exceed $MAX_REASON_LENGTH characters")
        }
        val changed = if (request.hidden) hide(targetType, targetId, reason) else unhide(targetType, targetId)
        // 알림과 같은 기준: 실제로 상태가 바뀐 경우에만 기록한다(멱등 재요청은 무음).
        if (changed) {
            val action = if (request.hidden) AdminActionType.CONTENT_HIDDEN else AdminActionType.CONTENT_RESTORED
            actionLogs.record(adminUserId, action, targetType.name, targetId, reason)
        }
        return ContentVisibilityResponse(targetType.name, targetId, request.hidden)
    }

    /** 대상을 숨긴다. 이미 숨김이면 no-op(멱등). 대상이 없으면 404. 실제로 숨겼으면 true. */
    fun hide(targetType: ReportTargetType, targetId: String, reason: String?): Boolean {
        val now = Instant.now(clock)
        when (targetType) {
            ReportTargetType.POST -> {
                val post = posts.findByIdForUpdate(targetId) ?: throw notFound()
                // 예약 게시 대기 글(미래 publishAt)은 hiddenAt 슬롯을 예약이 선점한 상태라 관리자 숨김 대상이 아니다.
                // 숨김을 허용하면 hiddenAt!=null 가드에 걸려 사일런트 no-op 이 되거나 예약 상태를 훼손하므로 거절한다.
                if (post.isScheduledPending()) {
                    throw ResponseStatusException(HttpStatus.CONFLICT, "예약 게시 대기 중인 글은 숨김할 수 없습니다")
                }
                if (post.hiddenAt != null) return false
                post.hiddenAt = now
                post.hiddenReason = reason
                // 숨겨진 게시글 상세는 웹에서 열리지 않으므로 알림은 마이페이지로 보낸다.
                notifyAuthor(post.authorUserId, hidden = true, label = "게시글", href = "/mypage", reason = reason)
            }

            ReportTargetType.POST_COMMENT -> {
                val comment = postComments.findById(targetId).orElseThrow { notFound() }
                if (comment.hiddenAt != null) return false
                // 카운터 정합: 댓글 작성/삭제와 같은 순서로 post row 를 잠근 뒤 감소시킨다.
                val post = posts.findByIdForUpdate(comment.postId)
                comment.hiddenAt = now
                comment.hiddenReason = reason
                post?.let { it.comments = maxOf(0, it.comments - 1) }
                notifyAuthor(comment.authorUserId, hidden = true, label = "댓글", href = "/posts/${comment.postId}", reason = reason)
            }

            ReportTargetType.EVENT -> {
                val event = events.findByIdForUpdate(targetId) ?: throw notFound()
                if (event.hiddenAt != null) return false
                event.hiddenAt = now
                event.hiddenReason = reason
                // 숨겨진 행사 상세는 웹에서 열리지 않으므로 알림은 마이페이지로 보낸다.
                notifyAuthor(event.authorUserId, hidden = true, label = "행사", href = "/mypage", reason = reason)
            }

            ReportTargetType.EVENT_COMMENT -> {
                val comment = eventComments.findById(targetId).orElseThrow { notFound() }
                if (comment.hiddenAt != null) return false
                comment.hiddenAt = now
                comment.hiddenReason = reason
                notifyAuthor(comment.authorUserId, hidden = true, label = "댓글", href = "/events/${comment.eventId}", reason = reason)
            }

            ReportTargetType.EVENT_PROOF -> {
                val proof = eventProofs.findById(targetId).orElseThrow { notFound() }
                if (proof.hiddenAt != null) return false
                proof.hiddenAt = now
                proof.hiddenReason = reason
                notifyAuthor(proof.authorUserId, hidden = true, label = "참여 후기", href = "/events/${proof.eventId}?tab=proofs", reason = reason)
            }
        }
        return true
    }

    /**
     * 숨김을 해제한다. 이미 공개면 no-op(멱등). 대상이 없으면 404. 실제로 복구했으면 true.
     * 작성자가 삭제(soft delete)한 콘텐츠는 존재하지 않는 것으로 취급해 복구할 수 없다
     * (hiddenAt 만 지우면 삭제된 콘텐츠가 다시 공개되기 때문).
     */
    fun unhide(targetType: ReportTargetType, targetId: String): Boolean {
        when (targetType) {
            ReportTargetType.POST -> {
                val post = posts.findByIdForUpdate(targetId) ?: throw notFound()
                if (post.deletedAt != null) throw notFound()
                // 예약 게시 대기 글은 관리자 숨김이 아니므로 '복구' 대상이 아니다 — 복구하면 예약 시각을 무시하고 즉시 공개되고
                // (seq·발행 알림도 잡 경로를 안 타 잘못 처리)되므로 거절한다. 발행 예정 시각이 지났으나 잡 미실행인 구간도 마커로 포착.
                if (post.isScheduledPending()) {
                    throw ResponseStatusException(HttpStatus.CONFLICT, "예약 게시 대기 중인 글은 숨김 해제 대상이 아닙니다")
                }
                if (post.hiddenAt == null) return false
                post.hiddenAt = null
                post.hiddenReason = null
                notifyAuthor(post.authorUserId, hidden = false, label = "게시글", href = "/posts/${post.id}", reason = null)
            }

            ReportTargetType.POST_COMMENT -> {
                val comment = postComments.findById(targetId).orElseThrow { notFound() }
                if (comment.deletedAt != null) throw notFound()
                if (comment.hiddenAt == null) return false
                val post = posts.findByIdForUpdate(comment.postId)
                comment.hiddenAt = null
                comment.hiddenReason = null
                post?.let { it.comments += 1 }
                notifyAuthor(comment.authorUserId, hidden = false, label = "댓글", href = "/posts/${comment.postId}", reason = null)
            }

            ReportTargetType.EVENT -> {
                val event = events.findByIdForUpdate(targetId) ?: throw notFound()
                if (event.deletedAt != null) throw notFound()
                if (event.hiddenAt == null) return false
                event.hiddenAt = null
                event.hiddenReason = null
                notifyAuthor(event.authorUserId, hidden = false, label = "행사", href = "/events/${event.id}", reason = null)
            }

            ReportTargetType.EVENT_COMMENT -> {
                val comment = eventComments.findById(targetId).orElseThrow { notFound() }
                if (comment.deletedAt != null) throw notFound()
                if (comment.hiddenAt == null) return false
                comment.hiddenAt = null
                comment.hiddenReason = null
                notifyAuthor(comment.authorUserId, hidden = false, label = "댓글", href = "/events/${comment.eventId}", reason = null)
            }

            ReportTargetType.EVENT_PROOF -> {
                val proof = eventProofs.findById(targetId).orElseThrow { notFound() }
                if (proof.hiddenAt == null) return false
                proof.hiddenAt = null
                proof.hiddenReason = null
                notifyAuthor(proof.authorUserId, hidden = false, label = "참여 후기", href = "/events/${proof.eventId}?tab=proofs", reason = null)
            }
        }
        return true
    }

    /** 작성자에게 숨김/복구를 알린다. 시드 콘텐츠(작성자 미상)·탈퇴 사용자는 생략. */
    private fun notifyAuthor(authorUserId: Long?, hidden: Boolean, label: String, href: String, reason: String?) {
        if (authorUserId == null) return
        val author = users.findById(authorUserId).orElse(null)
        if (author == null || author.deletedAt != null) return
        if (hidden) {
            val body = buildString {
                append("운영 정책 위반으로 회원님의 ").append(label).append("이 숨김 처리되었습니다.")
                if (reason != null) append(" 사유: ").append(reason)
            }
            notifications.notifyUser(authorUserId, NotificationType.CONTENT_HIDDEN, "콘텐츠 숨김 안내", body, href)
        } else {
            notifications.notifyUser(
                authorUserId,
                NotificationType.CONTENT_RESTORED,
                "콘텐츠 숨김 해제 안내",
                "회원님의 ${label}이 다시 공개되었습니다.",
                href,
            )
        }
    }

    /**
     * 예약 게시 대기 여부 — 아직 `ScheduledPublishJob` 이 공개 전환하지 않은 예약 글.
     * 잡은 발행 시 hiddenAt·마커를 지우므로 "예약 마커가 남아 있음" == "미발행"이다. 발행 예정 시각이 이미 지났지만
     * 잡(60초 주기)이 아직 안 돈 구간까지 포함해야 하므로 `publishAt.isAfter(now)`(미래) 대신 마커 잔존으로 판별한다.
     * 단 마커는 free-text(관리자 사유와 값 충돌 가능)라, 예약 글만 갖는 `publishAt != null` 로 게이트해 오분류를 막는다.
     */
    private fun Post.isScheduledPending() = publishAt != null && hiddenReason == SCHEDULED_HIDDEN_REASON

    private fun notFound() = ResponseStatusException(HttpStatus.NOT_FOUND, "content not found")

    private companion object {
        const val MAX_LIST_PAGE_SIZE = 50
        const val TITLE_PREVIEW_LENGTH = 80
        const val MAX_REASON_LENGTH = 500
    }
}
