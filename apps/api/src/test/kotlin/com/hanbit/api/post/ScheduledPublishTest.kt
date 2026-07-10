package com.hanbit.api.post

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.time.Instant

/** 공지·주보 예약 게시 — 예약 중 비공개, 도래 시 잡이 공개 전환, 운영 숨김 불간섭. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ScheduledPublishTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val job: ScheduledPublishJob,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 2, email = "test-user-2@hanbit.local", passwordHash = "x", name = "일반 사용자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun createScheduled(publishAt: String, category: String = "NOTICE", bearer: String = adminToken) =
        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"예약 공지 본문","category":"$category","publishAt":"$publishAt"}"""
        }

    private fun future(): String = Instant.now().plusSeconds(3600).toString()

    @Test
    fun `예약 공지는 도래 전까지 공개 목록·상세에서 보이지 않고 작성자에겐 보인다`() {
        val response = createScheduled(future()).andExpect { status { isCreated() } }.andReturn()
        val node = mapper.readTree(response.response.contentAsString)
        val id = node["id"].asString()
        assertThat(node["hidden"].asBoolean()).isTrue()
        assertThat(node["publishAt"].asString()).isNotEmpty()

        // 공개 검색에서 제외.
        mvc.get("/api/posts/search") {
            param("category", "NOTICE")
            param("q", "예약 공지 본문")
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(0) }
        }
        // 타인 상세는 404, 작성자 상세는 hidden 배지와 함께 열린다.
        mvc.get("/api/posts/$id") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isNotFound() } }
        mvc.get("/api/posts/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.hidden") { value(true) }
        }
    }

    @Test
    fun `도래한 예약 글은 잡이 공개로 전환하고 정렬 키를 게시 시각으로 올린다`() {
        val id = mapper.readTree(
            createScheduled(future()).andExpect { status { isCreated() } }.andReturn().response.contentAsString,
        )["id"].asString()
        // 도래 상태로 되돌린다(잡은 clock 기준 now 와 비교).
        val post = posts.findById(id).orElseThrow()
        val oldSeq = post.seq
        post.publishAt = Instant.now().minusSeconds(60)
        posts.saveAndFlush(post)

        job.publishDue()

        val published = posts.findById(id).orElseThrow()
        assertThat(published.hiddenAt).isNull()
        assertThat(published.hiddenReason).isNull()
        assertThat(published.seq).isGreaterThan(oldSeq - 1)
        mvc.get("/api/posts/search") {
            param("category", "NOTICE")
            param("q", "예약 공지 본문")
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(1) }
        }
    }

    @Test
    fun `운영 숨김 글은 도래 시각이 있어도 잡이 건드리지 않는다`() {
        val id = mapper.readTree(
            createScheduled(future()).andExpect { status { isCreated() } }.andReturn().response.contentAsString,
        )["id"].asString()
        val post = posts.findById(id).orElseThrow()
        post.publishAt = Instant.now().minusSeconds(60)
        post.hiddenReason = "신고 처리로 숨김" // 운영 숨김으로 덮임 — 마커 불일치
        posts.saveAndFlush(post)

        job.publishDue()

        assertThat(posts.findById(id).orElseThrow().hiddenAt).isNotNull()
    }

    @Test
    fun `예약 게시는 공지·주보 전용이고 과거·형식 오류는 400`() {
        createScheduled(future(), category = "SHARING").andExpect { status { isBadRequest() } }
        createScheduled(Instant.now().minusSeconds(60).toString()).andExpect { status { isBadRequest() } }
        createScheduled("내일 아침").andExpect { status { isBadRequest() } }
    }
}
