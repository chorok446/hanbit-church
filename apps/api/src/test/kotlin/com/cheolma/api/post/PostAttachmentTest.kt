package com.cheolma.api.post

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.auth.UserRole
import com.cheolma.api.security.JwtService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostAttachmentTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val users: UserRepository,
) {
    private val userToken = jwt.issue(User(id = 1, email = "t@t.com", passwordHash = "x", name = "테스터"))
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@cheolma.local", passwordHash = "x", name = "관리자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun createPost(body: String, bearer: String) =
        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    @Test
    fun `관리자는 주보에 PDF 첨부를 달아 작성할 수 있다`() {
        createPost(
            """
            {"text":"7월 둘째 주 주보","category":"BULLETIN",
             "attachments":[{"name":"주보.pdf","url":"http://localhost:8080/uploads/a.pdf","size":12345}]}
            """.trimIndent(),
            adminToken,
        ).andExpect {
            status { isCreated() }
            jsonPath("$.attachments[0].name") { value("주보.pdf") }
            jsonPath("$.attachments[0].url") { value("http://localhost:8080/uploads/a.pdf") }
        }
    }

    @Test
    fun `공지·주보가 아닌 카테고리에 첨부를 달면 400`() {
        createPost(
            """{"text":"나눔 글","category":"SHARING","attachments":[{"name":"a.pdf","url":"http://x/a.pdf"}]}""",
            adminToken,
        ).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `첨부는 최대 3개까지다`() {
        val many = (1..4).joinToString(",") { """{"name":"f$it.pdf","url":"http://x/f$it.pdf"}""" }
        createPost(
            """{"text":"공지","category":"NOTICE","attachments":[$many]}""",
            adminToken,
        ).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `첨부 url 은 http(s)만 허용한다`() {
        createPost(
            """{"text":"공지","category":"NOTICE","attachments":[{"name":"a.pdf","url":"javascript:alert(1)"}]}""",
            adminToken,
        ).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `첨부 없는 응답은 빈 배열이다`() {
        createPost("""{"text":"일반 나눔"}""", userToken).andExpect {
            status { isCreated() }
            jsonPath("$.attachments") { isArray() }
            jsonPath("$.attachments") { isEmpty() }
        }
    }
}
