package com.cheolma.api.auth

import com.cheolma.api.security.AuthCookies
import com.cheolma.api.security.Totp
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Clock

/** 2FA 왕복: 등록(setup→enable) → 로그인 챌린지 → 코드 검증 → 해제. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TwoFactorFlowTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val jwt: com.cheolma.api.security.JwtService,
    @param:Autowired val objectMapper: JsonMapper,
    @param:Autowired val passwordEncoder: PasswordEncoder,
    @param:Autowired val clock: Clock,
) {
    private val password = "TwoFactor1!"

    private fun saveUser(email: String): User = users.saveAndFlush(
        User(email = email, passwordHash = passwordEncoder.encode(password)!!, name = "이단계"),
    )

    private fun bearer(user: User) = "Bearer ${jwt.issue(user)}"

    private fun currentCode(secret: String): String = Totp.codeAt(secret, clock.instant().epochSecond / 30)

    private fun postJson(path: String, body: String, token: String? = null) = mvc.post(path) {
        token?.let { headers { add("Authorization", it) } }
        contentType = MediaType.APPLICATION_JSON
        content = body
    }

    @Test
    fun `등록-로그인 챌린지-검증-해제 왕복이 동작한다`() {
        val user = saveUser("2fa-flow@cheolma.com")
        val token = bearer(user)

        // 1) setup — 시크릿 발급, 아직 미활성이라 로그인은 평소처럼 토큰 발급.
        val setupJson = postJson("/api/auth/2fa/setup", "{}", token)
            .andExpect { status { isOk() } }.andReturn().response.contentAsString
        val secret = objectMapper.readTree(setupJson)["secret"].asText()
        assertThat(objectMapper.readTree(setupJson)["otpauthUrl"].asText()).startsWith("otpauth://totp/")

        // 2) enable — 틀린 코드는 400, 맞는 코드는 활성 + 프로필에 반영.
        postJson("/api/auth/2fa/enable", """{"code":"000000"}""", token).andExpect { status { isBadRequest() } }
        val enabledProfile = postJson("/api/auth/2fa/enable", """{"code":"${currentCode(secret)}"}""", token)
            .andExpect { status { isOk() } }.andReturn().response.contentAsString
        assertThat(objectMapper.readTree(enabledProfile)["twoFactorEnabled"].asBoolean()).isTrue()

        // 3) 로그인 — 토큰·쿠키 대신 challengeToken.
        val loginRes = postJson("/api/auth/login", """{"email":"2fa-flow@cheolma.com","password":"$password"}""")
            .andExpect { status { isOk() } }.andReturn().response
        val loginJson = objectMapper.readTree(loginRes.contentAsString)
        assertThat(loginJson["twoFactorRequired"].asBoolean()).isTrue()
        assertThat(loginRes.getCookie(AuthCookies.NAME)).isNull()
        val challenge = loginJson["challengeToken"].asText()

        // 4) verify — 틀린 코드 401, 맞는 코드는 쿠키 발급 + 접속 기록.
        postJson("/api/auth/2fa/verify", """{"challengeToken":"$challenge","code":"000000"}""")
            .andExpect { status { isUnauthorized() } }
        val verifyRes = postJson(
            "/api/auth/2fa/verify",
            """{"challengeToken":"$challenge","code":"${currentCode(secret)}"}""",
        ).andExpect { status { isOk() } }.andReturn().response
        assertThat(verifyRes.getCookie(AuthCookies.NAME)?.value).isNotBlank()

        // 5) 해제 — 틀린 비밀번호 401, 맞으면 비활성 → 로그인이 다시 토큰을 바로 발급.
        postJson("/api/auth/2fa/disable", """{"password":"wrong"}""", token).andExpect { status { isUnauthorized() } }
        val disabledProfile = postJson("/api/auth/2fa/disable", """{"password":"$password"}""", token)
            .andExpect { status { isOk() } }.andReturn().response.contentAsString
        assertThat(objectMapper.readTree(disabledProfile)["twoFactorEnabled"].asBoolean()).isFalse()
        val directLogin = postJson("/api/auth/login", """{"email":"2fa-flow@cheolma.com","password":"$password"}""")
            .andExpect { status { isOk() } }.andReturn().response
        assertThat(directLogin.getCookie(AuthCookies.NAME)?.value).isNotBlank()
    }

    @Test
    fun `access 토큰은 챌린지 자리에, 챌린지 토큰은 access 자리에 쓸 수 없다`() {
        val user = saveUser("2fa-typ@cheolma.com")
        val access = jwt.issue(user)
        // access 를 챌린지로 위장한 verify → 401.
        postJson("/api/auth/2fa/verify", """{"challengeToken":"$access","code":"000000"}""")
            .andExpect { status { isUnauthorized() } }
        // 챌린지 토큰으로 인증 API 접근 → 401 (parse 가 typ=2fa 거절).
        val challenge = jwt.issueTwoFactorChallenge(user)
        mvc.get("/api/auth/me") { headers { add("Authorization", "Bearer $challenge") } }
            .andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `사용된 챌린지 토큰은 재사용할 수 없다`() {
        val user = saveUser("2fa-replay@cheolma.com")
        val token = bearer(user)
        val setupJson = postJson("/api/auth/2fa/setup", "{}", token)
            .andExpect { status { isOk() } }.andReturn().response.contentAsString
        val secret = objectMapper.readTree(setupJson)["secret"].asText()
        postJson("/api/auth/2fa/enable", """{"code":"${currentCode(secret)}"}""", token)
            .andExpect { status { isOk() } }

        val challenge = objectMapper.readTree(
            postJson("/api/auth/login", """{"email":"2fa-replay@cheolma.com","password":"$password"}""")
                .andReturn().response.contentAsString,
        )["challengeToken"].asText()

        // 첫 사용은 성공, 같은 챌린지 재사용은 코드가 맞아도 401.
        postJson("/api/auth/2fa/verify", """{"challengeToken":"$challenge","code":"${currentCode(secret)}"}""")
            .andExpect { status { isOk() } }
        postJson("/api/auth/2fa/verify", """{"challengeToken":"$challenge","code":"${currentCode(secret)}"}""")
            .andExpect { status { isUnauthorized() } }
    }
}
