package com.cheolma.api.event

import com.cheolma.api.auth.User
import com.cheolma.api.notification.NotificationRepository
import com.cheolma.api.notification.NotificationType
import com.cheolma.api.post.Author
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfiguration::class)
class EventParticipantRemovalControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val participantRepo: EventParticipantRepository,
    @param:Autowired private val notifications: NotificationRepository,
) {
    private val owner = 1L
    private val ownerToken = jwt.issue(User(id = owner, email = "owner@t.com", passwordHash = "x", name = "개설자", verified = true))
    private val strangerToken = jwt.issue(User(id = 9L, email = "stranger@t.com", passwordHash = "x", name = "남", verified = false))

    private fun saveEvent(status: String = "open", joined: Int = 1, authorUserId: Long? = owner): String {
        val id = "rm-c-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id, status, "퇴장 행사", "요약", "https://x/y.png",
                "2026-07-01", "2026-07-31", "2026-08-05", "2026-08-30",
                10, joined, "라벨", Author("개설자", true),
                EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun addParticipant(eventId: String, userId: Long): String {
        val id = "cp-${UUID.randomUUID()}"
        participantRepo.saveAndFlush(EventParticipant(id, eventId, userId))
        return id
    }

    private fun remove(eventId: String, participantId: String, bearer: String? = ownerToken) =
        mvc.delete("/api/events/$eventId/participants/$participantId") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        }

    private fun join(eventId: String, bearer: String) =
        mvc.post("/api/events/$eventId/join") {
            headers { add("Authorization", "Bearer $bearer") }
        }

    private fun removalNotificationsFor(eventId: String) =
        notifications.findAll().filter {
            it.href == "/events/$eventId" && it.type == NotificationType.EVENT_PARTICIPATION_REMOVED
        }

    // ---- 접근 제어 ----

    @Test
    fun `비로그인 제거는 401`() {
        val id = saveEvent()
        val pid = addParticipant(id, 2L)
        remove(id, pid, bearer = null).andExpect { status { isUnauthorized() } }
        assertThat(participantRepo.existsById(pid)).isTrue()
    }

    @Test
    fun `개설자는 open 행사 참가자를 제거하고 갱신된 joined를 받는다`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, 2L)

        remove(id, pid).andExpect {
            status { isOk() }
            jsonPath("$.eventId") { value(id) }
            jsonPath("$.participantId") { value(pid) }
            jsonPath("$.removed") { value(true) }
            jsonPath("$.joined") { value(0) }
            jsonPath("$.userId") { doesNotExist() }
        }
        assertThat(participantRepo.existsById(pid)).isFalse()
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(0)
    }

    @Test
    fun `다른 사용자는 403이고 데이터를 유지한다`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, 2L)
        remove(id, pid, bearer = strangerToken).andExpect { status { isForbidden() } }
        assertThat(participantRepo.existsById(pid)).isTrue()
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(1)
    }

    @Test
    fun `authorUserId 없는 레거시 행사은 403`() {
        val id = saveEvent(joined = 1, authorUserId = null)
        val pid = addParticipant(id, 2L)
        remove(id, pid).andExpect { status { isForbidden() } }
        assertThat(participantRepo.existsById(pid)).isTrue()
    }

    @Test
    fun `없는 행사은 404`() {
        remove("rm-missing", "cp-missing").andExpect { status { isNotFound() } }
    }

    @Test
    fun `다른 행사의 participantId는 404`() {
        val id = saveEvent()
        val otherId = saveEvent()
        val otherPid = addParticipant(otherId, 2L)
        remove(id, otherPid).andExpect { status { isNotFound() } }
        assertThat(participantRepo.existsById(otherPid)).isTrue()
    }

    @Test
    fun `없는 participantId는 404`() {
        val id = saveEvent()
        remove(id, "cp-missing").andExpect { status { isNotFound() } }
    }

    // ---- 상태 정책 ----

    @Test
    fun `upcoming과 closed 행사 제거는 409이고 데이터를 유지한다`() {
        for (status in listOf("upcoming", "closed")) {
            val id = saveEvent(status = status, joined = 1)
            val pid = addParticipant(id, 2L)
            remove(id, pid).andExpect { status { isConflict() } }
            assertThat(participantRepo.existsById(pid)).isTrue()
            assertThat(eventRepo.findById(id).get().joined).isEqualTo(1)
            assertThat(removalNotificationsFor(id)).isEmpty()
        }
    }

    @Test
    fun `반복 제거는 404`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, 2L)
        remove(id, pid).andExpect { status { isOk() } }
        remove(id, pid).andExpect { status { isNotFound() } }
    }

    // ---- 데이터 정합성 ----

    @Test
    fun `joined는 0 미만으로 내려가지 않는다`() {
        // joined=0 인데 participant 가 남은 비정상 상태에서도 floor 0 을 유지한다.
        val id = saveEvent(joined = 0)
        val pid = addParticipant(id, 2L)
        remove(id, pid).andExpect {
            status { isOk() }
            jsonPath("$.joined") { value(0) }
        }
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(0)
    }

    @Test
    fun `한 명을 제거해도 다른 참가자는 유지된다`() {
        val id = saveEvent(joined = 2)
        val keep = addParticipant(id, 2L)
        val drop = addParticipant(id, 3L)
        remove(id, drop).andExpect { status { isOk() } }
        assertThat(participantRepo.existsById(drop)).isFalse()
        assertThat(participantRepo.existsById(keep)).isTrue()
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(1)
    }

    @Test
    fun `제거된 사용자는 다시 참여할 수 있다`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, 2L)
        remove(id, pid).andExpect { status { isOk() } }

        val rejoiner = jwt.issue(User(id = 2L, email = "p2@t.com", passwordHash = "x", name = "참가자2", verified = false))
        join(id, rejoiner).andExpect { status { isOk() } }
        assertThat(participantRepo.existsByEventIdAndUserId(id, 2L)).isTrue()
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(1)
    }

    @Test
    fun `정원이 찬 행사에서 한 명 제거 후 다른 사용자가 참여할 수 있다`() {
        val id = saveEvent(joined = 2)
        eventRepo.saveAndFlush(eventRepo.findById(id).get().apply { capacity = 2 })
        val pid = addParticipant(id, 2L)
        addParticipant(id, 3L)

        val newcomer = jwt.issue(User(id = 4L, email = "p4@t.com", passwordHash = "x", name = "신규", verified = false))
        join(id, newcomer).andExpect { status { isConflict() } } // 정원 초과
        remove(id, pid).andExpect { status { isOk() } }
        join(id, newcomer).andExpect { status { isOk() } }
        assertThat(eventRepo.findById(id).get().joined).isEqualTo(2)
        assertThat(participantRepo.countByEventId(id)).isEqualTo(2)
    }

    // ---- 알림 ----

    @Test
    fun `제거 성공 시 제거된 사용자에게 unread 알림이 생성되고 href가 행사 상세로 연결된다`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, 2L)
        remove(id, pid).andExpect { status { isOk() } }

        val created = removalNotificationsFor(id)
        assertThat(created).hasSize(1)
        assertThat(created[0].userId).isEqualTo(2L)
        assertThat(created[0].href).isEqualTo("/events/$id")
        assertThat(created[0].body).isEqualTo("퇴장 행사")
        assertThat(created[0].readAt).isNull() // unread → unread count 증가
    }

    @Test
    fun `개설자가 자기 자신을 제거해도 알림이 생성된다`() {
        val id = saveEvent(joined = 1)
        val pid = addParticipant(id, owner) // 개설자가 참가자이기도 한 경우
        remove(id, pid).andExpect { status { isOk() } }

        val created = removalNotificationsFor(id)
        assertThat(created).hasSize(1)
        assertThat(created[0].userId).isEqualTo(owner)
    }

    @Test
    fun `없는 participant 제거와 권한 실패에서는 알림이 없다`() {
        val missing = saveEvent(joined = 0)
        remove(missing, "cp-missing").andExpect { status { isNotFound() } }
        assertThat(removalNotificationsFor(missing)).isEmpty()

        val forbidden = saveEvent(joined = 1)
        val pid = addParticipant(forbidden, 2L)
        remove(forbidden, pid, bearer = strangerToken).andExpect { status { isForbidden() } }
        assertThat(removalNotificationsFor(forbidden)).isEmpty()
    }
}
