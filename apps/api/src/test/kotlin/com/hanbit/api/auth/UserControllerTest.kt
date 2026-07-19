package com.hanbit.api.auth

import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostRepository
import com.hanbit.api.security.JwtService
import org.hamcrest.Matchers
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserControllerTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val users: UserRepository,
    @param:Autowired val posts: PostRepository,
) {
    @Test
    fun `공개 프로필과 게시글 목록을 조회한다`() {
        val user = users.save(
            User(
                email = "pub-${UUID.randomUUID()}@t.com",
                passwordHash = "x",
                name = "공개유저",
                verified = true,
                profileImageUrl = "https://example.com/a.jpg",
            ),
        )
        val userId = requireNotNull(user.id)
        posts.save(
            Post(
                id = "up-${UUID.randomUUID()}",
                author = Author("공개유저", true),
                time = "방금",
                text = "공개 글",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                authorUserId = userId,
            ),
        )

        val viewerToken = jwt.issue(user)

        mvc.get("/api/users/$userId") {
            header("Authorization", "Bearer $viewerToken")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.name", Matchers.`is`("공개유저")) }
            .andExpect { jsonPath("$.postCount", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.email") { doesNotExist() } }

        mvc.get("/api/users/$userId/posts") {
            header("Authorization", "Bearer $viewerToken")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.content.length()", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.content[0].authorId", Matchers.`is`(userId.toInt())) }
    }

    @Test
    fun `숨김(운영 차단) 글은 공개 프로필 게시글 수에서 제외된다`() {
        val user = users.save(User(email = "hd-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "숨김유저", verified = true))
        val userId = requireNotNull(user.id)
        fun makePost(text: String) = Post(
            id = "hp-${UUID.randomUUID()}",
            author = Author("숨김유저", true),
            time = "방금",
            text = text,
            tags = emptyList(),
            images = emptyList(),
            likes = 0,
            comments = 0,
            authorUserId = userId,
        )
        posts.save(makePost("공개 글"))
        posts.save(makePost("숨겨질 글").apply { hiddenAt = java.time.Instant.now(); hiddenReason = "운영 차단" })

        val token = jwt.issue(user)
        // 단건 프로필 경로 — postCount 는 숨김 글을 제외한 1
        mvc.get("/api/users/$userId") {
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.postCount", Matchers.`is`(1)) }

        // 목록 매핑(bulk) 경로 — 검색에서도 동일하게 숨김 제외
        val admin = users.save(User(email = "ha-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "숨김검색관리자", role = UserRole.ADMIN.name))
        mvc.get("/api/users/search") {
            param("q", "숨김유저")
            header("Authorization", "Bearer ${jwt.issue(admin)}")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.content[?(@.id == $userId)].postCount", Matchers.hasItem(1)) }
    }

    @Test
    fun `프로필과 프로필 글 목록은 비로그인이면 401 — 교인 전용`() {
        val user = users.save(User(email = "an-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "익명확인"))
        val userId = requireNotNull(user.id)
        mvc.get("/api/users/$userId").andExpect { status { isUnauthorized() } }
        mvc.get("/api/users/$userId/posts").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `차단 상태가 공개 프로필에 반영된다`() {
        val blocker = users.save(User(email = "bl-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "차단자"))
        val target = users.save(User(email = "bt-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "대상"))
        val targetId = requireNotNull(target.id)
        val token = jwt.issue(blocker)

        mvc.get("/api/users/$targetId") {
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.blockedByMe", Matchers.`is`(false)) }

        mvc.post("/api/users/$targetId/block") {
            header("Authorization", "Bearer $token")
        }.andExpect { status { isNoContent() } }

        mvc.get("/api/users/$targetId") {
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.blockedByMe", Matchers.`is`(true)) }

        mvc.delete("/api/users/$targetId/block") {
            header("Authorization", "Bearer $token")
        }.andExpect { status { isNoContent() } }

        mvc.get("/api/users/$targetId") {
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.blockedByMe", Matchers.`is`(false)) }
    }

    @Test
    fun `없는 사용자는 404`() {
        val viewer = users.save(User(email = "nf-${UUID.randomUUID()}@t.com", passwordHash = "x", name = "조회자"))
        mvc.get("/api/users/999999999") {
            header("Authorization", "Bearer ${jwt.issue(viewer)}")
        }
            .andExpect { status { isNotFound() } }
    }

    @Test
    fun `사용자 검색은 이름 부분 일치로 찾고 탈퇴·정지 사용자를 제외한다`() {
        val tag = UUID.randomUUID().toString().take(8)
        val now = java.time.Instant.now()
        val active = users.save(User(email = "s1-$tag@t.com", passwordHash = "x", name = "활동-$tag"))
        users.save(User(email = "s2-$tag@t.com", passwordHash = "x", name = "탈퇴-$tag", deletedAt = now))
        users.save(
            User(
                email = "s3-$tag@t.com",
                passwordHash = "x",
                name = "정지-$tag",
                suspendedUntil = now.plusSeconds(3600),
            ),
        )
        val activeId = requireNotNull(active.id).toInt()
        val admin = users.save(User(email = "sa-$tag@t.com", passwordHash = "x", name = "검색관리자", role = UserRole.ADMIN.name))
        val viewerToken = jwt.issue(admin)

        mvc.get("/api/users/search") {
            param("q", tag)
            header("Authorization", "Bearer $viewerToken")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.content[0].id", Matchers.`is`(activeId)) }
            .andExpect { jsonPath("$.content[0].name", Matchers.`is`("활동-$tag")) }
            .andExpect { jsonPath("$.content[0].email") { doesNotExist() } }
    }

    @Test
    fun `승인 대기(pending) 사용자는 공개 프로필 404, 검색에서도 제외된다`() {
        val tag = UUID.randomUUID().toString().take(8)
        // approvedAt = null → 관리자 미승인(pending). 공개 노출 대상(승인+미탈퇴+미정지)이 아니다.
        val pending = users.save(
            User(email = "pd-$tag@t.com", passwordHash = "x", name = "대기-$tag", approvedAt = null),
        )
        val admin = users.save(User(email = "pa-$tag@t.com", passwordHash = "x", name = "승인관리자", role = UserRole.ADMIN.name))
        val token = jwt.issue(admin)

        mvc.get("/api/users/${pending.id}") {
            header("Authorization", "Bearer $token")
        }.andExpect { status { isNotFound() } }

        mvc.get("/api/users/search") {
            param("q", tag)
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(0)) }
    }

    @Test
    fun `사용자 검색에서 빈 검색어는 빈 결과, 로그인 시 차단 상태를 포함한다`() {
        val tag = UUID.randomUUID().toString().take(8)
        val viewer = users.save(User(email = "sv-$tag@t.com", passwordHash = "x", name = "탐색자-$tag", role = UserRole.ADMIN.name))
        val target = users.save(User(email = "st-$tag@t.com", passwordHash = "x", name = "대상-$tag"))
        val token = jwt.issue(viewer)

        mvc.get("/api/users/search") {
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(0)) }

        mvc.post("/api/users/${target.id}/block") {
            header("Authorization", "Bearer $token")
        }.andExpect { status { isNoContent() } }

        mvc.get("/api/users/search") {
            param("q", "대상-$tag")
            header("Authorization", "Bearer $token")
        }
            .andExpect { status { isOk() } }
            .andExpect { jsonPath("$.totalElements", Matchers.`is`(1)) }
            .andExpect { jsonPath("$.content[0].blockedByMe", Matchers.`is`(true)) }
    }

    @Test
    fun `사용자 검색어가 100자를 넘으면 400`() {
        val tag = UUID.randomUUID().toString().take(8)
        val viewer = users.save(User(email = "sq-$tag@t.com", passwordHash = "x", name = "질의자-$tag", role = UserRole.ADMIN.name))
        mvc.get("/api/users/search") {
            param("q", "a".repeat(101))
            header("Authorization", "Bearer ${jwt.issue(viewer)}")
        }
            .andExpect { status { isBadRequest() } }
    }

    @Test
    fun `사용자 검색은 비로그인이면 401 — 교인 실명 열거 차단`() {
        mvc.get("/api/users/search") { param("q", "김") }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `사용자 검색은 일반 회원이면 403 — 전체 회원 열거는 회원 관리 권한자 전용`() {
        val tag = UUID.randomUUID().toString().take(8)
        val member = users.save(User(email = "sm-$tag@t.com", passwordHash = "x", name = "일반-$tag"))
        mvc.get("/api/users/search") {
            param("q", "김")
            header("Authorization", "Bearer ${jwt.issue(member)}")
        }.andExpect { status { isForbidden() } }
    }
}
