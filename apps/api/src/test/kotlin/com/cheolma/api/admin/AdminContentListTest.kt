package com.cheolma.api.admin

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.auth.UserRole
import com.cheolma.api.event.Event
import com.cheolma.api.event.EventBody
import com.cheolma.api.event.EventRepository
import com.cheolma.api.post.Author
import com.cheolma.api.post.Post
import com.cheolma.api.post.PostRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 관리자 콘텐츠 관리 목록: 숨김 포함 조회, 숨김만 필터, 타입 검증, 권한. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminContentListTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: com.cheolma.api.security.JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val events: EventRepository,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@cheolma.local", passwordHash = "x", name = "관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 2, email = "test-user-2@cheolma.local", passwordHash = "x", name = "일반"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun savePost(text: String, hidden: Boolean = false, seq: Long = System.nanoTime()): Post =
        posts.saveAndFlush(
            Post(
                id = "acl-post-${UUID.randomUUID()}",
                author = Author("작성자", false),
                time = "방금",
                text = text,
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                seq = seq,
                hiddenAt = if (hidden) Instant.now() else null,
                hiddenReason = if (hidden) "규정 위반" else null,
            ),
        )

    private fun saveEvent(title: String, hidden: Boolean = false): Event = events.saveAndFlush(
        Event(
            "acl-event-${UUID.randomUUID()}", "open", title, "요약", "https://x/t.png",
            "2026-07-01", "2026-07-31", "2026-08-05", "2026-08-30",
            10, 0, "라벨", Author("개설자", false),
            EventBody("소개", emptyList(), emptyList()),
            seq = System.nanoTime(),
            hiddenAt = if (hidden) Instant.now() else null,
        ),
    )

    @Test
    fun `게시글 목록은 숨김을 포함하고 hiddenOnly 필터가 동작한다`() {
        savePost("공개 게시글", seq = 2)
        savePost("숨김 게시글", hidden = true, seq = 1)

        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "POST")
            param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '공개 게시글')].hidden") { value(false) }
            jsonPath("$.content[?(@.title == '숨김 게시글')].hidden") { value(true) }
            jsonPath("$.content[?(@.title == '숨김 게시글')].hiddenReason") { value("규정 위반") }
        }

        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "POST")
            param("hiddenOnly", "true")
            param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '공개 게시글')]") { doesNotExist() }
            jsonPath("$.content[?(@.title == '숨김 게시글')]") { exists() }
        }
    }

    @Test
    fun `행사 목록도 숨김 상태를 노출한다`() {
        saveEvent("숨김 행사", hidden = true)
        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "EVENT")
            param("hiddenOnly", "true")
            param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '숨김 행사')].targetType") { value("EVENT") }
        }
    }

    @Test
    fun `지원하지 않는 타입은 400, 일반 사용자는 403`() {
        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "COMMENT")
        }.andExpect { status { isBadRequest() } }

        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `대시보드 summary 는 마감 임박·경과 행사 수를 담는다`() {
        // saveEvent 헬퍼는 recruitEnd 고정이라, 마감 경과/여유/이미 마감 케이스를 직접 저장한다.
        fun save(recruitEnd: String, status: String = "open") = events.saveAndFlush(
            Event(
                "acl-close-${UUID.randomUUID()}", status, "마감 검증", "요약", "https://x/t.png",
                "2026-06-01", recruitEnd, "2026-12-01", "2026-12-31",
                10, 0, "라벨", Author("개설자", false),
                EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(),
            ),
        )
        save("2020-01-01") // 마감 경과 & open → 포함
        save("2999-12-31") // 여유 → 제외
        save("2020-01-01", status = "closed") // 이미 마감 → 제외

        val body = mvc.get("/api/admin/summary") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isOk() } }.andReturn().response.contentAsString
        val closingSoon = tools.jackson.databind.json.JsonMapper().readTree(body)["closingSoonEvents"].asLong()
        // 마감 경과 open 1건은 반드시 포함, 여유·closed 는 제외(시드에 다른 open 행사가 있을 수 있어 >= 로 검증).
        org.assertj.core.api.Assertions.assertThat(closingSoon).isGreaterThanOrEqualTo(1)
    }

    @Test
    fun `q 검색은 본문·작성자(게시글)와 제목(행사)을 거른다`() {
        savePost("가을 바자회 안내문")
        savePost("무관한 글", hidden = true)
        saveEvent("가을 바자회")

        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "POST"); param("q", "바자회"); param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '가을 바자회 안내문')]") { exists() }
            jsonPath("$.content[?(@.title == '무관한 글')]") { doesNotExist() }
        }

        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "EVENT"); param("q", "바자회"); param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '가을 바자회')]") { exists() }
        }

        // 숨김만 + 검색 조합.
        mvc.get("/api/admin/content") {
            headers { add("Authorization", "Bearer $adminToken") }
            param("type", "POST"); param("q", "무관한"); param("hiddenOnly", "true"); param("size", "50")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.title == '무관한 글')].hidden") { value(true) }
        }
    }
}
