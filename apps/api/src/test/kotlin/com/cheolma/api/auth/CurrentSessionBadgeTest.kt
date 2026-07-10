package com.cheolma.api.auth

import com.cheolma.api.security.AuthCookies
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

/**
 * 접속 기록 "현재 세션" 배지: 로그인 세션 id(JWT sid)가 기록에 저장되고,
 * 같은 세션 토큰으로 조회하면 그 기록만 currentSession=true 로 표시된다.
 * refresh 회전 후에도 sid 가 유지되어 배지가 이어진다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CurrentSessionBadgeTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val objectMapper: JsonMapper,
    @param:Autowired val passwordEncoder: PasswordEncoder,
) {
    private val password = "Session1!"

    private fun saveUser(email: String): User = users.saveAndFlush(
        User(email = email, passwordHash = passwordEncoder.encode(password)!!, name = "세션테스트"),
    )

    private fun login(email: String, userAgent: String): MockHttpServletResponse =
        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            header("User-Agent", userAgent)
            content = objectMapper.writeValueAsString(LoginRequest(email, password))
        }.andExpect { status { isOk() } }.andReturn().response

    private fun accessLogsJson(token: String): String =
        mvc.get("/api/auth/access-logs") {
            headers { add("Authorization", "Bearer $token") }
        }.andExpect { status { isOk() } }.andReturn().response.contentAsString

    private fun MockHttpServletResponse.cookieValue(name: String): String =
        requireNotNull(getCookie(name)?.value) { "cookie $name missing" }

    private val chrome = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
    private val safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Safari/604.1"

    @Test
    fun `현재 세션의 기록만 currentSession=true 이고 다른 로그인 기록은 false 다`() {
        saveUser("session-badge@cheolma.com")
        val first = login("session-badge@cheolma.com", chrome).cookieValue(AuthCookies.NAME)
        login("session-badge@cheolma.com", safari) // 다른 세션 하나 더

        val json = accessLogsJson(first)
        // 기록 2건 중 첫 로그인(Chrome) 세션 것만 현재 세션이다.
        val content = objectMapper.readTree(json)["content"]
        assertThat(content.size()).isEqualTo(2)
        val currentFlagsByBrowser = content.associate { it["browser"].asText() to it["currentSession"].asBoolean() }
        assertThat(currentFlagsByBrowser["Chrome"]).isTrue()
        assertThat(currentFlagsByBrowser["Safari"]).isFalse()
    }

    @Test
    fun `refresh 회전 후에도 같은 세션으로 표시된다`() {
        saveUser("session-refresh@cheolma.com")
        val loginRes = login("session-refresh@cheolma.com", chrome)
        val refreshCookie = loginRes.cookieValue(AuthCookies.REFRESH_NAME)

        val refreshed = mvc.post("/api/auth/refresh") {
            cookie(jakarta.servlet.http.Cookie(AuthCookies.REFRESH_NAME, refreshCookie))
        }.andExpect { status { isOk() } }.andReturn().response
        val newAccess = refreshed.cookieValue(AuthCookies.NAME)

        val json = objectMapper.readTree(accessLogsJson(newAccess))["content"]
        // 로그인 1건 + refresh 1건 — 둘 다 같은 세션이라 모두 currentSession=true.
        assertThat(json.size()).isEqualTo(2)
        json.forEach { assertThat(it["currentSession"].asBoolean()).isTrue() }
    }
}
