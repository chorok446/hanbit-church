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
import org.springframework.test.web.servlet.patch
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/** 공지·주보 상단 고정 — 스태프 전용 토글과 목록 상단 정렬 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostPinTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val posts: PostRepository,
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

    private fun savePost(category: String, seq: Long): String {
        val id = "pin-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                id = id,
                author = Author("교회", true),
                time = "방금 전",
                text = "고정 테스트 $id",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                seq = seq,
                category = category,
            ),
        )
        return id
    }

    private fun pin(postId: String, pinned: Boolean, bearer: String? = adminToken) =
        mvc.patch("/api/posts/$postId/pin") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"pinned":$pinned}"""
        }

    @Test
    fun `관리자는 공지를 고정하고 해제할 수 있다`() {
        val postId = savePost(PostCategory.NOTICE, seq = 1)
        pin(postId, true).andExpect {
            status { isOk() }
            jsonPath("$.pinned") { value(true) }
        }
        assertThat(posts.findById(postId).orElseThrow().pinnedAt).isNotNull()

        pin(postId, false).andExpect {
            status { isOk() }
            jsonPath("$.pinned") { value(false) }
        }
        assertThat(posts.findById(postId).orElseThrow().pinnedAt).isNull()
    }

    @Test
    fun `고정된 공지는 더 최신 글보다 목록에서 먼저 온다`() {
        val old = savePost(PostCategory.NOTICE, seq = 1)
        val newer = savePost(PostCategory.NOTICE, seq = 2)
        pin(old, true).andExpect { status { isOk() } }

        val body = mvc.get("/api/posts/search") {
            param("category", "NOTICE")
            param("size", "10")
            param("q", "고정 테스트")
        }
            .andExpect { status { isOk() } }
            .andReturn().response.contentAsString
        // Jackson 3 는 JsonNode.map 이 노드 자신에 적용된다 — Kotlin Iterable.map 을 쓰려면 toList() 필요.
        val ids = mapper.readTree(body)["content"].toList().map { it["id"].asString() }
        assertThat(ids.indexOf(old)).isLessThan(ids.indexOf(newer))
        // 고정 배지 플래그도 응답에 실린다.
        val pinnedFlags = mapper.readTree(body)["content"].toList().associate { it["id"].asString() to it["pinned"].asBoolean() }
        assertThat(pinnedFlags[old]).isTrue()
        assertThat(pinnedFlags[newer]).isFalse()
    }

    @Test
    fun `공지·주보가 아닌 글은 고정할 수 없다 - 400`() {
        val sharing = savePost(PostCategory.SHARING, seq = 1)
        pin(sharing, true).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `일반 회원과 비로그인은 고정할 수 없다`() {
        val postId = savePost(PostCategory.NOTICE, seq = 1)
        pin(postId, true, bearer = userToken).andExpect { status { isForbidden() } }
        pin(postId, true, bearer = null).andExpect { status { isUnauthorized() } }
    }
}
