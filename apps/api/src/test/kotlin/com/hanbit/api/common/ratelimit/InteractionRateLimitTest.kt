package com.hanbit.api.common.ratelimit

import com.hanbit.api.auth.User
import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostRepository
import com.hanbit.api.security.JwtService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 좋아요·북마크류 상호작용 토글 rate limit — 알림 스팸 방지. IP 기준 한도 초과 시 429. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(
    properties = [
        "app.rate-limit.content.interaction.limit=2",
        "app.rate-limit.content.interaction.window-seconds=60",
    ],
)
class InteractionRateLimitTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val jwt: JwtService,
) {
    private val token = jwt.issue(User(id = 1, email = "il@t.com", passwordHash = "x", name = "상호작용", verified = false))

    private fun savePost(): String {
        val id = "irl-${UUID.randomUUID()}"
        posts.save(Post(id, Author("작성자", false), "방금", "본문", emptyList(), emptyList(), 0, 0))
        return id
    }

    @Test
    fun `좋아요 토글은 IP당 limit 초과 시 429를 반환한다`() {
        val a = savePost()
        val b = savePost()
        val c = savePost()
        fun like(postId: String) = mvc.post("/api/posts/$postId/like") {
            headers {
                add("Authorization", "Bearer $token")
                add("X-Forwarded-For", "203.0.113.21")
            }
        }
        like(a).andExpect { status { isOk() } }
        like(b).andExpect { status { isOk() } }
        like(c).andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
        }
    }
}
