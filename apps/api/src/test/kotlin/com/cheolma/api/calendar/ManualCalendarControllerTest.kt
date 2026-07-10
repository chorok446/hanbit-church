package com.cheolma.api.calendar

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.auth.UserRole
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 수동 일정 CRUD: 권한(ADMIN·OPERATOR만 쓰기), 검증, 공개 범위 조회. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ManualCalendarControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val repo: ManualCalendarEventRepository,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@cheolma.local", passwordHash = "x", name = "일정관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 2, email = "test-user-2@cheolma.local", passwordHash = "x", name = "일반 사용자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun body(
        title: String = "부활절 새벽 연합 예배",
        type: String = "worship",
        startDate: String = "2026-08-15",
        endDate: String = "",
        startTime: String = "오전 6:00",
        location: String = "본당",
    ) = """{"title":"$title","type":"$type","startDate":"$startDate","endDate":"$endDate",
           "startTime":"$startTime","location":"$location"}"""

    private fun create(json: String = body(), token: String = adminToken) = mvc.post("/api/admin/calendar") {
        headers { add("Authorization", "Bearer $token") }
        contentType = MediaType.APPLICATION_JSON
        content = json
    }

    private fun saveEvent(startDate: String, endDate: String? = null, title: String = "저장 일정"): ManualCalendarEvent =
        repo.saveAndFlush(
            ManualCalendarEvent(
                id = "mc-${UUID.randomUUID()}",
                title = title,
                type = "etc",
                startDate = startDate,
                endDate = endDate,
                createdBy = "테스트",
                createdAt = Instant.now(),
            ),
        )

    @Test
    fun `일반 사용자는 수동 일정을 등록할 수 없다`() {
        create(token = userToken).andExpect { status { isForbidden() } }
        mvc.post("/api/admin/calendar") {
            contentType = MediaType.APPLICATION_JSON
            content = body()
        }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `관리자는 수동 일정을 등록하고 blank 선택값은 null 로 저장된다`() {
        create(body(endDate = "", location = " ")).andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("부활절 새벽 연합 예배") }
            jsonPath("$.type") { value("worship") }
            jsonPath("$.startDate") { value("2026-08-15") }
            jsonPath("$.endDate") { value(null) }
            jsonPath("$.location") { value(null) }
            jsonPath("$.createdBy") { value("일정관리자") }
        }
    }

    @Test
    fun `잘못된 타입·날짜 순서는 400 이다`() {
        create(body(type = "holiday")).andExpect { status { isBadRequest() } }
        create(body(startDate = "2026-08-15", endDate = "2026-08-14")).andExpect { status { isBadRequest() } }
        create(body(title = " ")).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `공개 캘린더 조회는 비로그인으로 가능하고 범위와 겹치는 멀티데이 일정을 포함한다`() {
        saveEvent("2026-09-01", "2026-09-05", title = "가을 부흥회")
        saveEvent("2026-09-20", title = "심방")
        saveEvent("2026-10-10", title = "범위 밖")

        mvc.get("/api/calendar") { param("from", "2026-09-03"); param("to", "2026-09-25") }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
            jsonPath("$[0].title") { value("가을 부흥회") }
            jsonPath("$[1].title") { value("심방") }
        }
    }

    @Test
    fun `수정과 삭제가 동작하고 없는 일정은 404 다`() {
        val saved = saveEvent("2026-09-01")

        mvc.put("/api/admin/calendar/${saved.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = body(title = "수정된 일정", type = "etc", startDate = "2026-09-02")
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("수정된 일정") }
            jsonPath("$.startDate") { value("2026-09-02") }
        }

        mvc.delete("/api/admin/calendar/${saved.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isOk() } }
        assertThat(repo.existsById(saved.id)).isFalse()

        mvc.delete("/api/admin/calendar/${saved.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `ics 피드는 수동 일정과 공개 행사를 담고 특수문자를 이스케이프한다`() {
        repo.saveAndFlush(
            ManualCalendarEvent(
                id = "mc-ics-1",
                title = "부활절; 새벽, 연합예배",
                type = "worship",
                startDate = "2026-09-01",
                endDate = "2026-09-02",
                createdBy = "테스트",
                createdAt = Instant.now(),
            ),
        )

        val body = mvc.get("/api/calendar/ics").andExpect {
            status { isOk() }
            content { contentTypeCompatibleWith("text/calendar") }
        }.andReturn().response.contentAsString

        assertThat(body).startsWith("BEGIN:VCALENDAR")
        assertThat(body).contains("UID:manual-mc-ics-1@cheolma-church")
        assertThat(body).contains("SUMMARY:부활절\\; 새벽\\, 연합예배")
        assertThat(body).contains("DTSTART;VALUE=DATE:20260901")
        // DTEND 는 exclusive — 마지막 날(9/2) 포함을 위해 9/3.
        assertThat(body).contains("DTEND;VALUE=DATE:20260903")
        assertThat(body.trimEnd()).endsWith("END:VCALENDAR")
    }
}
