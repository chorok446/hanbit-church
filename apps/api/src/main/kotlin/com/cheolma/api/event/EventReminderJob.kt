package com.cheolma.api.event

import com.cheolma.api.auth.UserRepository
import com.cheolma.api.notification.NotificationService
import com.cheolma.api.notification.NotificationType
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.LocalDate

/**
 * 행사 모집 마감 임박(D-1) 알림 배치. 저장(북마크)만 하고 아직 참여하지 않은 사용자는
 * 상태 전환 알림(참여자 대상)을 받지 못해 마감을 놓치기 쉽다 — 그 공백을 메운다.
 * (업스트림 dasida cf67a7c 이식 — campaign→event 도메인 적응)
 *
 * - 대상: open + 미숨김·미삭제 + recruitEnd 가 내일 + 미발송(recruitEndReminderSentAt null)
 * - 수신자: 행사를 저장한 사용자 중 아직 참여하지 않은 사람(참여자는 이미 상태 알림 대상).
 *   notifyEventUpdates 설정을 존중하고, 개설자 본인은 notify() 의 self-skip 으로 제외된다.
 * - 멱등성: 발송 후 recruitEndReminderSentAt 마킹 — 재기동/중복 실행에도 행사당 1회.
 */
@Component
class EventReminderJob(
    private val events: EventRepository,
    private val bookmarks: EventBookmarkRepository,
    private val participants: EventParticipantRepository,
    private val users: UserRepository,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    // 사용자가 아침에 확인할 수 있는 시간대. @Scheduled 와 @Transactional 을 한 메서드에 둔다 —
    // 별도 진입 메서드에서 내부 호출하면 프록시를 우회해 트랜잭션 없이 돌고, 조회된 행사가
    // detached 상태라 멱등성 마킹(recruitEndReminderSentAt)이 flush 되지 않는다.
    @Scheduled(cron = "0 40 8 * * *")
    @Transactional
    fun remindRecruitEndingTomorrow(): Int {
        val tomorrow = LocalDate.now(clock).plusDays(1).toString()
        val targets = events.findByStatusAndRecruitEndAndHiddenAtIsNullAndDeletedAtIsNullAndRecruitEndReminderSentAtIsNull(
            "open",
            tomorrow,
        )
        var sent = 0
        val now = Instant.now(clock)
        targets.forEach { event ->
            val joinedUserIds = participants.findByEventId(event.id).map { it.userId }.toSet()
            bookmarks.findByEventId(event.id)
                .asSequence()
                .filter { it.userId !in joinedUserIds }
                .forEach { bookmark ->
                    val recipient = users.findById(bookmark.userId).orElse(null) ?: return@forEach
                    if (recipient.deletedAt != null || !recipient.notifyEventUpdates) return@forEach
                    notifications.notify(
                        recipientUserId = bookmark.userId,
                        // 시드 행사는 개설자 미상(null) — self-skip 대상이 없다는 뜻이므로 sentinel 사용.
                        actorUserId = event.authorUserId ?: -1L,
                        type = NotificationType.EVENT_RECRUIT_ENDING,
                        title = "저장한 행사 신청이 내일 마감돼요",
                        body = event.title,
                        href = "/events/${event.id}",
                    )
                    sent++
                }
            event.recruitEndReminderSentAt = now
        }
        if (sent > 0) log.info("event recruit-ending reminders sent: {}", sent)
        return sent
    }

    private companion object {
        private val log = LoggerFactory.getLogger(EventReminderJob::class.java)
    }
}
