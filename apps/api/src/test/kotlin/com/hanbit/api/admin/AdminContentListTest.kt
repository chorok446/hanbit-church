package com.hanbit.api.admin

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.event.Event
import com.hanbit.api.event.EventBody
import com.hanbit.api.event.EventRepository
import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostRepository
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
    @param:Autowired private val jwt: com.hanbit.api.security.JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val events: EventRepository,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 2, email = "test-user-2@hanbit.local", passwordHash = "x", name = "일반"),
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
}
