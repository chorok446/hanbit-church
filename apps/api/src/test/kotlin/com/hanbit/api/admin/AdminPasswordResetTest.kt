package com.hanbit.api.admin

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import org.assertj.core.api.Assertions.assertThat
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
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/** 관리자 비밀번호 초기화 — 임시 비밀번호 발급·강제 변경 플래그·권한 경계 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminPasswordResetTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: com.hanbit.api.security.JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val actionLogs: AdminActionLogRepository,
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

    private fun signupUser(): Pair<Long, String> {
        val email = "reset-${UUID.randomUUID()}@test.com"
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"초기화 대상"}"""
        }.andExpect { status { isCreated() } }
        return users.findByEmail(email)!!.id!! to email
    }

    private fun reset(userId: Long, bearer: String? = adminToken) =
        mvc.post("/api/admin/users/$userId/password-reset") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        }

    private fun login(email: String, password: String) =
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"$password"}"""
        }

    @Test
    fun `초기화하면 기존 비밀번호는 막히고 임시 비밀번호로 로그인되며 변경 안내 플래그가 켜진다`() {
        val (userId, email) = signupUser()

        val response = reset(userId).andExpect { status { isOk() } }.andReturn()
        val body = mapper.readTree(response.response.contentAsString)
        val temp = body["tempPassword"].asString()
        assertThat(temp).hasSize(12)
        assertThat(body["userId"].asLong()).isEqualTo(userId)

        login(email, "Password1!").andExpect { status { isUnauthorized() } }
        val loginResponse = login(email, temp).andExpect { status { isOk() } }.andReturn()
        assertThat(mapper.readTree(loginResponse.response.contentAsString)["passwordChangeRequired"].asBoolean()).isTrue()
        assertThat(users.findById(userId).orElseThrow().passwordResetRequired).isTrue()
    }

    @Test
    fun `임시 비밀번호를 새 비밀번호로 변경하면 플래그가 해제된다`() {
        val (userId, email) = signupUser()
        val temp = mapper.readTree(
            reset(userId).andExpect { status { isOk() } }.andReturn().response.contentAsString,
        )["tempPassword"].asString()

        val token = jwt.issue(users.findById(userId).orElseThrow())
        mvc.put("/api/auth/password") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"currentPassword":"$temp","newPassword":"NewPassword2!"}"""
        }.andExpect { status { isOk() } }

        assertThat(users.findById(userId).orElseThrow().passwordResetRequired).isFalse()
        login(email, "NewPassword2!").andExpect {
            status { isOk() }
            jsonPath("$.passwordChangeRequired") { value(false) }
        }
    }

    @Test
    fun `초기화하면 대상의 기존 세션이 전부 해지된다 - 공격자 세션 차단`() {
        val (userId, email) = signupUser()
        // 대상 사용자의 활성 세션(공격자 세션 시나리오).
        val session = mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!"}"""
        }.andExpect { status { isOk() } }.andReturn().response
        val access = requireNotNull(session.getCookie(com.hanbit.api.security.AuthCookies.NAME)).value
        mvc.get("/api/auth/me") { headers { add("Authorization", "Bearer $access") } }
            .andExpect { status { isOk() } }

        reset(userId).andExpect {
            status { isOk() }
            jsonPath("$.revokedSessions") { value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)) }
        }

        // 기존 세션의 access 토큰이 즉시 차단된다(sid denylist).
        mvc.get("/api/auth/me") { headers { add("Authorization", "Bearer $access") } }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `감사 로그에는 임시 비밀번호가 남지 않는다`() {
        val (userId, _) = signupUser()
        val temp = mapper.readTree(
            reset(userId).andExpect { status { isOk() } }.andReturn().response.contentAsString,
        )["tempPassword"].asString()

        val entries = actionLogs.findAll().filter {
            it.action == AdminActionType.PASSWORD_RESET.name && it.targetId == userId.toString()
        }
        assertThat(entries).hasSize(1)
        assertThat(entries[0].detail ?: "").doesNotContain(temp)
    }

    @Test
    fun `관리자 계정은 초기화할 수 없다`() {
        reset(4).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `일반 사용자와 비로그인은 초기화할 수 없다`() {
        val (userId, _) = signupUser()
        reset(userId, bearer = userToken).andExpect { status { isForbidden() } }
        reset(userId, bearer = null).andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `탈퇴한 사용자는 404`() {
        val (userId, _) = signupUser()
        val user = users.findById(userId).orElseThrow()
        user.deletedAt = java.time.Instant.now()
        users.saveAndFlush(user)
        reset(userId).andExpect { status { isNotFound() } }
    }
}
