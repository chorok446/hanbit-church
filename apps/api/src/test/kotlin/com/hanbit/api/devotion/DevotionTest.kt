package com.hanbit.api.devotion

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
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.LocalDate

/**
 * 데일리 큐티 — 관리자 CRUD, 미래 예약분 공개 게이트(devotionDate<=오늘), 은혜나눔 댓글 권한.
 * 큐티 도메인은 SeedRunner 로 3건이 미리 적재되지만(dv-seed-*), 이 테스트는 자체 등록분으로 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DevotionTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val repo: DevotionRepository,
    @param:Autowired private val commentRepo: DevotionCommentRepository,
    @param:Autowired private val clock: Clock,
) {
    private val contentToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "콘텐츠지기"),
    )
    private val userToken = jwt.issue(
        User(id = 2, email = "test-user-2@hanbit.local", passwordHash = "x", name = "교인 갑"),
    )
    private val otherToken = jwt.issue(
        User(id = 9, email = "test-user-9@hanbit.local", passwordHash = "x", name = "교인 을"),
    )

    private fun today() = LocalDate.now(clock)

    @BeforeEach
    fun setUp() {
        val staff = users.findById(4).orElseThrow()
        staff.role = UserRole.CONTENT.name
        users.saveAndFlush(staff)
        // 시드(dv-seed-*)가 오늘·최근 날짜를 점유하므로 테스트는 깨끗한 상태에서 시작한다(tx 롤백).
        commentRepo.deleteAll()
        repo.deleteAll()
    }

    private fun create(date: LocalDate, bearer: String = contentToken) =
        mvc.post("/api/admin/devotions") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"date":"$date","verseRef":"시편 1:1","verseText":"복 있는 사람","meditation":"오늘의 묵상"}"""
        }

    private fun createId(date: LocalDate): String = mapper.readTree(
        create(date).andExpect { status { isCreated() } }.andReturn().response.contentAsString,
    )["id"].asString()

    @Test
    fun `관리자 등록분은 오늘의 말씀·목록·상세에 노출된다`() {
        val id = createId(today())
        mvc.get("/api/devotions/today").andExpect {
            status { isOk() }
            jsonPath("$.id") { value(id) }
            jsonPath("$.scheduled") { value(false) }
        }
        mvc.get("/api/devotions/$id").andExpect { status { isOk() } }
        mvc.get("/api/devotions") { param("size", "50") }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id=='$id')]") { exists() }
        }
    }

    @Test
    fun `미래 예약분은 공개 상세·목록에서 감춰지고 관리자에게만 보인다`() {
        val id = createId(today().plusDays(3))
        // 공개 상세·목록에서 제외.
        mvc.get("/api/devotions/$id").andExpect { status { isNotFound() } }
        mvc.get("/api/devotions") { param("size", "50") }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id=='$id')]") { doesNotExist() }
        }
        // 관리자 조회엔 scheduled=true 로 노출.
        mvc.get("/api/admin/devotions/$id") {
            headers { add("Authorization", "Bearer $contentToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.scheduled") { value(true) }
        }
    }

    @Test
    fun `sitemap 은 발행분만 담고 미래 예약분은 제외한다`() {
        val published = createId(today().minusDays(1))
        val future = createId(today().plusDays(1))
        mvc.get("/api/devotions/sitemap-ids").andExpect {
            status { isOk() }
            jsonPath("$.ids[?(@=='$published')]") { exists() }
            jsonPath("$.ids[?(@=='$future')]") { doesNotExist() }
        }
    }

    @Test
    fun `같은 날짜 중복 등록은 409, 형식·빈 값은 400`() {
        create(today()).andExpect { status { isCreated() } }
        create(today()).andExpect { status { isConflict() } }
        mvc.post("/api/admin/devotions") {
            headers { add("Authorization", "Bearer $contentToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"date":"내일","verseRef":"시편 1:1","verseText":"x","meditation":"y"}"""
        }.andExpect { status { isBadRequest() } }
        mvc.post("/api/admin/devotions") {
            headers { add("Authorization", "Bearer $contentToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"date":"${today().plusDays(1)}","verseRef":"","verseText":"x","meditation":"y"}"""
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `콘텐츠 권한 없는 일반 사용자는 등록할 수 없다`() {
        create(today(), bearer = userToken).andExpect { status { isForbidden() } }
    }

    @Test
    fun `은혜나눔 댓글은 작성 시 카운터가 오르고 본인·스태프만 삭제한다`() {
        val id = createId(today())
        val commentId = mapper.readTree(
            mvc.post("/api/devotions/$id/comments") {
                headers { add("Authorization", "Bearer $userToken") }
                contentType = MediaType.APPLICATION_JSON
                content = """{"text":"오늘 말씀에 큰 은혜 받았습니다"}"""
            }.andExpect {
                status { isCreated() }
                jsonPath("$.canDelete") { value(true) }
            }.andReturn().response.contentAsString,
        )["id"].asString()

        // 상세 카운터 반영.
        mvc.get("/api/devotions/$id").andExpect { jsonPath("$.comments") { value(1) } }
        // 목록에도 반영.
        mvc.get("/api/devotions/$id/comments").andExpect {
            status { isOk() }
            jsonPath("$[0].text") { value("오늘 말씀에 큰 은혜 받았습니다") }
        }
        // 남이 삭제 시도 → 403.
        mvc.delete("/api/devotions/$id/comments/$commentId") {
            headers { add("Authorization", "Bearer $otherToken") }
        }.andExpect { status { isForbidden() } }
        // 본인 삭제 → 204, 카운터 감소.
        mvc.delete("/api/devotions/$id/comments/$commentId") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isNoContent() } }
        mvc.get("/api/devotions/$id").andExpect { jsonPath("$.comments") { value(0) } }
    }

    @Test
    fun `미래 예약분에는 댓글을 달 수 없다`() {
        val id = createId(today().plusDays(2))
        mvc.post("/api/devotions/$id/comments") {
            headers { add("Authorization", "Bearer $userToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"미리 인사"}"""
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `스태프는 타인 댓글도 삭제할 수 있다`() {
        val id = createId(today())
        val commentId = mapper.readTree(
            mvc.post("/api/devotions/$id/comments") {
                headers { add("Authorization", "Bearer $userToken") }
                contentType = MediaType.APPLICATION_JSON
                content = """{"text":"신고 대상이 될 수 있는 글"}"""
            }.andExpect { status { isCreated() } }.andReturn().response.contentAsString,
        )["id"].asString()

        mvc.delete("/api/devotions/$id/comments/$commentId") {
            headers { add("Authorization", "Bearer $contentToken") }
        }.andExpect { status { isNoContent() } }
        assertThat(
            mapper.readTree(mvc.get("/api/devotions/$id").andReturn().response.contentAsString)["comments"].asInt(),
        ).isEqualTo(0)
    }
}
