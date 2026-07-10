package com.cheolma.api.event

import com.cheolma.api.auth.UserRepository
import com.cheolma.api.notification.NotificationRepository
import com.cheolma.api.notification.NotificationType
import com.cheolma.api.post.Author
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.data.domain.PageRequest
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * 모집 마감 임박(D-1) 알림 배치. 수신자 선정(저장했지만 미참여·알림 설정 존중)과
 * 멱등성(행사당 1회)을 검증한다. 사용자 1·2·9 는 테스트 시드의 활성 사용자.
 */
@SpringBootTest
@Transactional
class EventReminderJobTest(
    @param:Autowired private val job: EventReminderJob,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val bookmarkRepo: EventBookmarkRepository,
    @param:Autowired private val participantRepo: EventParticipantRepository,
    @param:Autowired private val userRepo: UserRepository,
    @param:Autowired private val notificationRepo: NotificationRepository,
    @param:Autowired private val clock: Clock,
) {
    private fun saveEvent(recruitEnd: String, status: String = "open", authorUserId: Long? = 4): Event =
        eventRepo.saveAndFlush(
            Event(
                id = "rem-c-${UUID.randomUUID()}",
                status = status,
                title = "마감 임박 행사",
                summary = "요약",
                thumb = "https://example.com/thumb.png",
                recruitStart = "2026-01-01",
                recruitEnd = recruitEnd,
                runStart = "2027-01-01",
                runEnd = "2027-01-31",
                capacity = 10,
                joined = 1,
                daysLeftLabel = "모집중",
                author = Author("개설자", false),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = System.currentTimeMillis(),
                authorUserId = authorUserId,
            ),
        )

    private fun bookmark(eventId: String, userId: Long) {
        bookmarkRepo.saveAndFlush(
            EventBookmark(id = "rem-b-${UUID.randomUUID()}", eventId = eventId, userId = userId),
        )
    }

    private fun reminderCountFor(userId: Long): Int =
        notificationRepo.findByUserId(userId, PageRequest.of(0, 50))
            .content.count { it.type == NotificationType.EVENT_RECRUIT_ENDING }

    @Test
    fun `내일 마감 행사를 저장한 미참여 사용자에게만 1회 알림을 보낸다`() {
        val tomorrow = LocalDate.now(clock).plusDays(1).toString()
        val event = saveEvent(recruitEnd = tomorrow)

        bookmark(event.id, userId = 1) // 저장만 → 수신
        bookmark(event.id, userId = 2) // 저장 + 알림 꺼둠 → 제외
        userRepo.findById(2).orElseThrow().let {
            it.notifyEventUpdates = false
            userRepo.saveAndFlush(it)
        }
        bookmark(event.id, userId = 9) // 저장 + 이미 참여 → 제외
        participantRepo.saveAndFlush(
            EventParticipant(id = "rem-p-${UUID.randomUUID()}", eventId = event.id, userId = 9),
        )

        val sent = job.remindRecruitEndingTomorrow()

        assertThat(sent).isEqualTo(1)
        assertThat(reminderCountFor(1)).isEqualTo(1)
        assertThat(reminderCountFor(2)).isZero()
        assertThat(reminderCountFor(9)).isZero()
        assertThat(eventRepo.findById(event.id).orElseThrow().recruitEndReminderSentAt).isNotNull()

        // 멱등성: 같은 날 재실행해도 추가 발송 없음
        assertThat(job.remindRecruitEndingTomorrow()).isZero()
        assertThat(reminderCountFor(1)).isEqualTo(1)
    }

    @Test
    fun `마감이 내일이 아니거나 숨김·마감된 행사는 대상이 아니다`() {
        val tomorrow = LocalDate.now(clock).plusDays(1).toString()
        val later = LocalDate.now(clock).plusDays(7).toString()

        val notSoon = saveEvent(recruitEnd = later)
        val closed = saveEvent(recruitEnd = tomorrow, status = "closed")
        val hidden = saveEvent(recruitEnd = tomorrow).also {
            it.hiddenAt = java.time.Instant.now(clock)
            eventRepo.saveAndFlush(it)
        }
        listOf(notSoon, closed, hidden).forEach { bookmark(it.id, userId = 1) }

        assertThat(job.remindRecruitEndingTomorrow()).isZero()
        assertThat(reminderCountFor(1)).isZero()
    }
}
