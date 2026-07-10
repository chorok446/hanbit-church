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
                // 게시 시각 기준으로 최신 정렬 상단에 오도록 정렬 키를 갱신한다(작성 시점이 아니라 게시 시점).
                post.seq = now.toEpochMilli()
            }
            if (due.isNotEmpty()) log.info("scheduled posts published (count={})", due.size)
        } catch (ex: Exception) {
            // 배치 실패가 앱을 흔들지 않게 로그만 남긴다 — 다음 주기에 재시도된다.
            log.warn("scheduled publish job failed", ex)
        }
    }
}
