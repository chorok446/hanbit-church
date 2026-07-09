package com.cheolma.api.event

import com.cheolma.api.auth.User
import com.cheolma.api.notification.NotificationRepository
import com.cheolma.api.post.Author
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.data.domain.PageRequest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EventProofControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val proofRepo: EventProofRepository,
    @param:Autowired private val participantRepo: EventParticipantRepository,
    @param:Autowired private val notificationRepo: NotificationRepository,
) {
    // TestUserSeed 가 만든 활성 사용자 row 를 가리키는 고정 id 토큰.
    private val participantToken = jwt.issue(
        User(id = 1, email = "proof@test.com", passwordHash = "x", name = "참여자", verified = true),
    )
    private val strangerToken = jwt.issue(
        User(id = 2, email = "stranger-proof@test.com", passwordHash = "x", name = "비참여자", verified = false),
    )

    private fun saveEvent(status: String = "open", authorUserId: Long? = 4): String {
        val id = "proof-c-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id = id,
                status = status,
                title = "인증 행사",
                summary = "요약",
                thumb = "https://example.com/thumb.png",
                recruitStart = "2026-07-01",
                recruitEnd = "2026-07-31",
                runStart = "2026-08-01",
                runEnd = "2026-08-31",
                capacity = 10,
                joined = 1,
                daysLeftLabel = "모집중",
                author = Author("개설자", false),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun joinAsParticipant(eventId: String, userId: Long = 1) {
        participantRepo.saveAndFlush(
            EventParticipant(id = "part-${UUID.randomUUID()}", eventId = eventId, userId = userId),
        )
    }

    private fun createProof(
        eventId: String,
        text: String = "인증 소감",
        images: List<String> = listOf("https://example.com/proof.jpg"),
        bearer: String? = participantToken,
    ) = mvc.post("/api/events/$eventId/proofs") {
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        contentType = MediaType.APPLICATION_JSON
        content = mapper.writeValueAsString(CreateEventProofRequest(text = text, images = images))
    }

    @Test
    fun `참여자는 인증을 작성하고 목록에서 확인한다`() {
        val eventId = saveEvent()
        joinAsParticipant(eventId)

        createProof(eventId)
            .andExpect { status { isCreated() } }
            .andExpect { jsonPath("$.text", Matchers.`is`("인증 소감")) }
            .andExpect { jsonPath("$.images.length()", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.ownedByMe", Matchers.`is`(true)) }

        mvc.get("/api/events/$eventId/proofs") {
            headers { add("Authorization", "Bearer $participantToken") }
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.proofedByMe", Matchers.`is`(true)) }

        // 개설자(4)에게 알림이 생성된다.
        val notified = notificationRepo.findByUserId(4L, PageRequest.of(0, 10))
            .content.count { it.type == "EVENT_PROOF_CREATED" }
        assertThat(notified).isEqualTo(1)
    }

    @Test
    fun `비참여자는 403, 모집 전 행사은 409`() {
        val eventId = saveEvent()
        createProof(eventId, bearer = strangerToken)
            .andExpect { status { isForbidden() } }

        val upcomingId = saveEvent(status = "upcoming")
        joinAsParticipant(upcomingId)
        createProof(upcomingId)
            .andExpect { status { isConflict() } }
    }

    @Test
    fun `1인 1인증 - 중복 작성은 409, 삭제 후 재작성은 허용`() {
        val eventId = saveEvent()
        joinAsParticipant(eventId)

        val body = createProof(eventId).andExpect { status { isCreated() } }
            .andReturn().response.contentAsString
        val proofId = mapper.readTree(body).get("id").asString()

        createProof(eventId, text = "두 번째")
            .andExpect { status { isConflict() } }

        mvc.delete("/api/events/$eventId/proofs/$proofId") {
            headers { add("Authorization", "Bearer $participantToken") }
        }.andExpect { status { isNoContent() } }

        createProof(eventId, text = "다시 작성")
            .andExpect { status { isCreated() } }
    }

    @Test
    fun `타인의 인증은 삭제할 수 없다`() {
        val eventId = saveEvent()
        joinAsParticipant(eventId)
        val body = createProof(eventId).andReturn().response.contentAsString
        val proofId = mapper.readTree(body).get("id").asString()

        mvc.delete("/api/events/$eventId/proofs/$proofId") {
            headers { add("Authorization", "Bearer $strangerToken") }
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `숨김 인증은 목록에서 제외되고 proofedByMe 는 유지된다`() {
        val eventId = saveEvent()
        proofRepo.saveAndFlush(
            EventProof(
                id = "cpr-${UUID.randomUUID()}",
                eventId = eventId,
                author = Author("참여자", true),
                text = "숨김 대상",
                images = emptyList(),
                createdAt = Instant.now(),
                authorUserId = 1,
                hiddenAt = Instant.now(),
            ),
        )

        mvc.get("/api/events/$eventId/proofs") {
            headers { add("Authorization", "Bearer $participantToken") }
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(0)) }
            .andExpect { jsonPath("$.proofedByMe", Matchers.`is`(true)) }
    }

    @Test
    fun `빈 소감은 400, 비로그인 작성은 401`() {
        val eventId = saveEvent()
        joinAsParticipant(eventId)

        createProof(eventId, text = "  ")
            .andExpect { status { isBadRequest() } }

        createProof(eventId, bearer = null)
            .andExpect { status { isUnauthorized() } }
    }
}
