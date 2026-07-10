package com.hanbit.api.auth

import com.hanbit.api.auth.User
import com.hanbit.api.security.JwtService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = ["app.signup.require-approval=true"])
class SignupApprovalTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val jwt: JwtService,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "관리자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun signup(email: String) =
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"김실명"}"""
        }

    private fun login(email: String) =
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!"}"""
        }

    @Test
    fun `승인제에서 가입하면 토큰 없이 승인 대기 응답을 받는다`() {
        signup("pending1@t.com").andExpect {
            status { isCreated() }
            jsonPath("$.pendingApproval") { value(true) }
            jsonPath("$.token") { doesNotExist() }
        }
        val user = users.findByEmail("pending1@t.com")!!
        assert(user.isPendingApproval)
    }

    @Test
    fun `승인 전에는 로그인할 수 없다(403 안내)`() {
        signup("pending2@t.com").andExpect { status { isCreated() } }
        login("pending2@t.com").andExpect {
            status { isForbidden() }
            jsonPath("$.detail") { value(org.hamcrest.Matchers.containsString("승인 대기")) }
        }
    }

    @Test
    fun `관리자가 승인하면 로그인할 수 있다`() {
        signup("pending3@t.com").andExpect { status { isCreated() } }
        val id = users.findByEmail("pending3@t.com")!!.id!!

        mvc.get("/api/admin/users/pending") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == $id)].pendingApproval") { value(true) }
        }

        mvc.patch("/api/admin/users/$id/approve") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.pendingApproval") { value(false) }
        }

        login("pending3@t.com").andExpect {
            status { isOk() }
            jsonPath("$.token") { exists() }
        }
    }

    @Test
    fun `관리자가 거절하면 로그인할 수 없고 같은 이메일로 재가입할 수 있다`() {
        signup("pending4@t.com").andExpect { status { isCreated() } }
        val id = users.findByEmail("pending4@t.com")!!.id!!

        mvc.patch("/api/admin/users/$id/reject") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isOk() } }

        login("pending4@t.com").andExpect { status { isUnauthorized() } }
        signup("pending4@t.com").andExpect { status { isCreated() } }
    }

    @Test
    fun `일반 사용자는 승인 API 를 쓸 수 없다`() {
        val userToken = jwt.issue(User(id = 1, email = "test-user-1@hanbit.local", passwordHash = "x", name = "일반"))
        mvc.get("/api/admin/users/pending") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isForbidden() } }
    }
}
