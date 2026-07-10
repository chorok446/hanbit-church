package com.hanbit.api.admin

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserAccessLog
import com.hanbit.api.auth.UserAccessLogRepository
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostRepository
import com.hanbit.api.security.JwtService
import org.hamcrest.Matchers.greaterThanOrEqualTo
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminStatsControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val accessLogs: UserAccessLogRepository,
    @param:Autowired private val posts: PostRepository,
) {
    // user 4 를 관리자로 승격해 사용한다(@Transactional 이라 테스트 후 롤백).
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 1, email = "test-user-1@hanbit.local", passwordHash = "x", name = "일반 사용자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    @Test
    fun `관리자는 일별 통계를 조회할 수 있다`() {
        users.saveAndFlush(
            User(email = "stats-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "통계가입자", createdAt = Instant.now()),
        )
        posts.saveAndFlush(
            Post(
                id = "stats-post-${UUID.randomUUID()}",
                author = Author("작성자", false),
                time = "방금",
                text = "통계용 게시글",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                seq = System.currentTimeMillis(),
                authorUserId = 1,
            ),
        )

        mvc.get("/api/admin/stats?days=7") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.days") { value(7) }
            jsonPath("$.daily.length()") { value(7) }
            // 마지막 요소가 오늘(KST) — 방금 만든 가입·게시글이 집계된다.
            jsonPath("$.daily[6].signups") { value(greaterThanOrEqualTo(1)) }
            jsonPath("$.daily[6].posts") { value(greaterThanOrEqualTo(1)) }
        }
    }

    @Test
    fun `일별 활성 회원은 같은 사용자의 중복 접속을 하루 1로 센다`() {
        val logs = listOf(
            UserAccessLog(userId = 1, ipAddress = "10.0.0.1", os = "macOS", accessedAt = Instant.now(), sessionId = "s1"),
            UserAccessLog(userId = 1, ipAddress = "10.0.0.2", os = "iOS", accessedAt = Instant.now(), sessionId = "s2"),
            UserAccessLog(userId = 4, ipAddress = "10.0.0.3", os = "Windows", accessedAt = Instant.now(), sessionId = "s3"),
        )
        logs.forEach { accessLogs.saveAndFlush(it) }

        mvc.get("/api/admin/stats?days=3") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            // 사용자 1(중복 2건)과 4 — distinct 로 2명.
            jsonPath("$.daily[2].activeUsers") { value(greaterThanOrEqualTo(2)) }
        }
    }

    @Test
    fun `허용 범위를 벗어난 days 는 400`() {
        mvc.get("/api/admin/stats?days=0") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isBadRequest() } }

        mvc.get("/api/admin/stats?days=91") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `일반 사용자는 통계를 조회할 수 없다`() {
        mvc.get("/api/admin/stats") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isForbidden() } }
    }
}
