package com.hanbit.api.event

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.post.Author
import com.hanbit.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 참가자 명단 CSV 내보내기 — 개설자 가드·BOM·이스케이프·연락처 미포함 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfiguration::class)
class EventParticipantsCsvExportTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val participantRepo: EventParticipantRepository,
    @param:Autowired private val users: UserRepository,
) {
    private val owner = 1L
    private val ownerToken = jwt.issue(User(id = owner, email = "owner@t.com", passwordHash = "x", name = "개설자", verified = true))
    private val strangerToken = jwt.issue(User(id = 9L, email = "stranger@t.com", passwordHash = "x", name = "남", verified = false))

    private fun saveEvent(authorUserId: Long? = owner): String {
        val id = "csv-c-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id, "open", "명단 행사", "요약", "https://x/y.png",
                "2026-07-01", "2026-07-31", "2026-08-05", "2026-08-30",
                10, 0, "라벨", Author("개설자", true),
                EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun export(eventId: String, bearer: String? = ownerToken) =
        mvc.get("/api/events/$eventId/participants/export") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        }

    @Test
    fun `개설자는 BOM 포함 CSV 를 내려받고 이름·인증만 담긴다`() {
        val eventId = saveEvent()
        // 테스트 시드 사용자 2(테스트 사용자 2)와 4를 참가시킨다.
        participantRepo.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, 2L))
        participantRepo.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, 4L))

        val response = export(eventId).andExpect {
            status { isOk() }
            header { string("Content-Disposition", "attachment; filename=\"participants-$eventId.csv\"") }
        }.andReturn().response
        assertThat(response.contentType).startsWith("text/csv")

        val bytes = response.contentAsByteArray
        assertThat(bytes.take(3)).containsExactly(0xEF.toByte(), 0xBB.toByte(), 0xBF.toByte())
        val body = String(bytes.copyOfRange(3, bytes.size), Charsets.UTF_8)
        val lines = body.split("\r\n")
        assertThat(lines[0]).isEqualTo("번호,이름,인증")
        assertThat(lines).hasSize(3)
        assertThat(lines[1]).isEqualTo("1,테스트 사용자 2,")
        // 이메일 등 연락처는 어디에도 없다(회원 열거 차단 정책 유지).
        assertThat(body).doesNotContain("@")
    }

    @Test
    fun `쉼표·따옴표가 든 이름은 RFC 4180 으로 이스케이프된다`() {
        val eventId = saveEvent()
        val tricky = users.saveAndFlush(
            User(email = "csv-${UUID.randomUUID()}@test.com", passwordHash = "x", name = "김, \"총무\""),
        )
        participantRepo.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, tricky.id!!))

        val bytes = export(eventId).andExpect { status { isOk() } }.andReturn().response.contentAsByteArray
        val body = String(bytes.copyOfRange(3, bytes.size), Charsets.UTF_8)
        assertThat(body).contains("\"김, \"\"총무\"\"\"")
    }

    @Test
    fun `수식으로 시작하는 이름은 작은따옴표로 무력화된다 — CSV 인젝션 차단`() {
        val eventId = saveEvent()
        val attacker = users.saveAndFlush(
            User(email = "csv-inj-${UUID.randomUUID()}@test.com", passwordHash = "x", name = "=HYPERLINK(1)"),
        )
        participantRepo.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, attacker.id!!))

        val bytes = export(eventId).andExpect { status { isOk() } }.andReturn().response.contentAsByteArray
        val body = String(bytes.copyOfRange(3, bytes.size), Charsets.UTF_8)
        assertThat(body).contains("'=HYPERLINK(1)")
        assertThat(body).doesNotContain(",=HYPERLINK")
    }

    @Test
    fun `개설자가 아니면 403, 비로그인은 401, 없는 행사는 404`() {
        val eventId = saveEvent()
        export(eventId, bearer = strangerToken).andExpect { status { isForbidden() } }
        export(eventId, bearer = null).andExpect { status { isUnauthorized() } }
        export("csv-c-none", bearer = ownerToken).andExpect { status { isNotFound() } }
    }

    @Test
    fun `authorUserId 없는 레거시 행사는 개설자 판별이 불가해 403`() {
        val eventId = saveEvent(authorUserId = null)
        export(eventId).andExpect { status { isForbidden() } }
    }
}
