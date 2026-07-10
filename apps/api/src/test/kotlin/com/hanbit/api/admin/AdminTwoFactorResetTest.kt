package com.hanbit.api.admin

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
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/** 관리자 2FA 해제 — 인증앱 분실 복구 경로(분실 시 본인 해제 API 는 로그인 불가라 못 쓴다). */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminTwoFactorResetTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
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

    private fun signupWithTotp(): Pair<Long, String> {
        val email = "totp-${UUID.randomUUID()}@test.com"
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"이단계"}"""
        }.andExpect { status { isCreated() } }
        val user = users.findByEmail(email)!!
        user.totpSecret = "JBSWY3DPEHPK3PXP"
        user.totpEnabledAt = Instant.now()
        users.saveAndFlush(user)
        return user.id!! to email
    }

    private fun reset(userId: Long, bearer: String? = adminToken) =
        mvc.delete("/api/admin/users/$userId/two-factor") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        }

    @Test
    fun `2FA 를 해제하면 비밀번호만으로 로그인된다`() {
        val (userId, email) = signupWithTotp()

        // 활성 상태에선 로그인이 2단계 챌린지를 요구한다.
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.twoFactorRequired") { value(true) }
        }

        reset(userId).andExpect {
            status { isOk() }
            jsonPath("$.twoFactorEnabled") { value(false) }
        }
        assertThat(users.findById(userId).orElseThrow().totpEnabled).isFalse()

        // 해제 후엔 바로 토큰이 발급된다.
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.token") { exists() }
        }

        // 감사 로그 기록.
        val entries = actionLogs.findAll().filter {
            it.action == AdminActionType.TWO_FACTOR_RESET.name && it.targetId == userId.toString()
        }
        assertThat(entries).hasSize(1)
    }

    @Test
    fun `이미 꺼져 있으면 무음 멱등 - 감사 로그 없음`() {
        val (userId, _) = signupWithTotp()
        reset(userId).andExpect { status { isOk() } }
        reset(userId).andExpect { status { isOk() } }
        val entries = actionLogs.findAll().filter {
            it.action == AdminActionType.TWO_FACTOR_RESET.name && it.targetId == userId.toString()
        }
        assertThat(entries).hasSize(1)
    }

    @Test
    fun `관리자 계정은 대상이 아니고 권한 없는 요청은 거절된다`() {
        val (userId, _) = signupWithTotp()
        reset(4).andExpect { status { isBadRequest() } }
        reset(userId, bearer = userToken).andExpect { status { isForbidden() } }
        reset(userId, bearer = null).andExpect { status { isUnauthorized() } }
    }
}
