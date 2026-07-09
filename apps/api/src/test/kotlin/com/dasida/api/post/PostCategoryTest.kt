package com.dasida.api.post

import com.dasida.api.auth.User
import com.dasida.api.auth.UserRepository
import com.dasida.api.auth.UserRole
import com.dasida.api.security.JwtService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostCategoryTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val posts: PostRepository,
    @param:Autowired val users: UserRepository,
) {
    private val token = jwt.issue(User(id = 1, email = "t@t.com", passwordHash = "x", name = "테스터"))

    // user 4 를 관리자로 승격해 사용한다(@Transactional 이라 테스트 후 롤백).
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@dasida.local", passwordHash = "x", name = "관리자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun createPost(body: String, bearer: String = token) =
        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    @Test
    fun `카테고리를 지정해 작성하면 응답과 저장에 반영된다`() {
        createPost("""{"text":"기도 부탁드립니다","category":"PRAYER"}""").andExpect {
            status { isCreated() }
            jsonPath("$.category") { value("PRAYER") }
        }
    }

    @Test
    fun `카테고리를 생략하면 나눔(SHARING)이 기본이다`() {
        createPost("""{"text":"오늘의 나눔"}""").andExpect {
            status { isCreated() }
            jsonPath("$.category") { value("SHARING") }
        }
    }

    @Test
    fun `허용되지 않은 카테고리는 400`() {
        createPost("""{"text":"본문","category":"FASHION"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `공지·주보는 일반 사용자가 작성할 수 없다(403)`() {
        createPost("""{"text":"이번 주 공지","category":"NOTICE"}""").andExpect { status { isForbidden() } }
        createPost("""{"text":"이번 주 주보","category":"BULLETIN"}""").andExpect { status { isForbidden() } }
    }

    @Test
    fun `관리자는 공지·주보를 작성할 수 있다`() {
        createPost("""{"text":"이번 주 공지","category":"NOTICE"}""", adminToken).andExpect {
            status { isCreated() }
            jsonPath("$.category") { value("NOTICE") }
        }
        createPost("""{"text":"이번 주 주보","category":"BULLETIN"}""", adminToken).andExpect {
            status { isCreated() }
            jsonPath("$.category") { value("BULLETIN") }
        }
    }

    @Test
    fun `수정으로 카테고리를 바꿀 수 있다`() {
        val id = "cat-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(id, Author("테스터", false), "방금", "본문", emptyList(), emptyList(), 0, 0, seq = 1, authorUserId = 1),
        )
        mvc.put("/api/posts/$id") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"본문","category":"PRAYER"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.category") { value("PRAYER") }
        }
    }

    @Test
    fun `일반 사용자는 수정으로 공지·주보로 바꿀 수 없다(403)`() {
        val id = "cat-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(id, Author("테스터", false), "방금", "본문", emptyList(), emptyList(), 0, 0, seq = 1, authorUserId = 1),
        )
        mvc.put("/api/posts/$id") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"본문","category":"NOTICE"}"""
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `검색을 카테고리로 필터링할 수 있다`() {
        val sermonId = "cat-s-${UUID.randomUUID()}"
        val prayerId = "cat-p-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(sermonId, Author("교회", true), "방금", "설교 요약", emptyList(), emptyList(), 0, 0, seq = System.nanoTime(), category = PostCategory.SERMON),
        )
        posts.saveAndFlush(
            Post(prayerId, Author("성도", false), "방금", "기도 부탁", emptyList(), emptyList(), 0, 0, seq = System.nanoTime(), category = PostCategory.PRAYER),
        )

        mvc.get("/api/posts/search?category=SERMON&size=50").andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '$sermonId')]") { exists() }
            jsonPath("$.content[?(@.id == '$prayerId')]") { doesNotExist() }
            jsonPath("$.content[?(@.category != 'SERMON')]") { doesNotExist() }
        }

        mvc.get("/api/posts/search?category=WRONG").andExpect { status { isBadRequest() } }
    }
}
