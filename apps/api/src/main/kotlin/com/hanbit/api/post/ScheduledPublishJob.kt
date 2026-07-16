package com.hanbit.api.post

import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant

/**
 * 공지·주보 예약 게시. 예약 글은 hiddenAt + SCHEDULED_HIDDEN_REASON 마커로 비공개 상태이며,
 * 도래하면 공개로 전환하고 seq 를 게시 시각으로 갱신해 목록 상단에 올린다.
 * 운영 숨김(다른 reason)은 마커가 달라 건드리지 않는다.
 */
@Component
class ScheduledPublishJob(
    private val posts: PostRepository,
    private val notifications: com.hanbit.api.notification.NotificationService,
    private val clock: Clock,
) {
    private val log = LoggerFactory.getLogger(ScheduledPublishJob::class.java)

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    fun publishDue() {
        try {
            val now = Instant.now(clock)
            val due = posts.findByPublishAtLessThanEqualAndHiddenAtIsNotNullAndHiddenReason(now, SCHEDULED_HIDDEN_REASON)
            due.forEach { post ->
                post.hiddenAt = null
                post.hiddenReason = null
                // 발행 완료 — publishAt 을 비워 재발행을 막는다. 과거 publishAt 이 남으면, 이후 관리자가 이 글을
                // 우연히 '예약 게시 대기' 사유로 숨겼을 때 (publishAt<=now + 마커 일치) 잡이 다시 공개로 되살린다.
                // publishAt=null 이면 isScheduledPending 도 false 라 관리자 숨김이 정상 동작한다.
                post.publishAt = null
                // 게시 시각 기준으로 최신 정렬 상단에 오도록 정렬 키를 갱신한다(작성 시점이 아니라 게시 시점).
                post.seq = now.toEpochMilli()
                // 작성자에게 발행 확인 알림 — 주일 아침 예약이 실제로 나갔는지 확인하는 용도.
                // notifyUser 는 이 잡의 트랜잭션에 참여하고 WS push 는 커밋 후에만 나간다.
                post.authorUserId?.let { authorId ->
                    notifications.notifyUser(
                        recipientUserId = authorId,
                        type = com.hanbit.api.notification.NotificationType.SCHEDULED_POST_PUBLISHED,
                        title = "예약한 글이 게시되었습니다",
                        body = post.text.replace(Regex("<[^>]*>"), " ").trim().take(80).ifBlank { "예약 게시" },
                        href = "/posts/${post.id}",
                    )
                }
            }
            if (due.isNotEmpty()) log.info("scheduled posts published (count={})", due.size)
        } catch (ex: Exception) {
            // 배치 실패가 앱을 흔들지 않게 로그만 남긴다 — 다음 주기에 재시도된다.
            log.warn("scheduled publish job failed", ex)
        }
    }
}
