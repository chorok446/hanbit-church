package com.hanbit.api.auth

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/**
 * 원격 세션 로그아웃 — 다른 기기의 세션(sid)을 무효화하면 그 세션의 access·refresh 가 모두 차단된다.
 * 테스트는 같은 계정으로 두 번 로그인해 세션 A(현재)·B(원격 대상)를 만든다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RemoteSessionLogoutTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val logs: UserAccessLogRepository,
) {
    private data class Session(val access: String, val refresh: String, val sid: String)

    private fun signupAndLoginTwice(): Pair<Session, Session> {
        val email = "remote-${UUID.randomUUID()}@test.com"
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"세션 주인"}"""
        }.andExpect { status { isCreated() } }
        return login(email) to login(email)
    }

    private fun login(email: String): Session {
        val response = mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!"}"""
        }.andExpect { status { isOk() } }.andReturn().response
        return sessionFrom(response)
    }

    private fun sessionFrom(response: MockHttpServletResponse): Session {
        val access = requireNotNull(response.getCookie(com.hanbit.api.security.AuthCookies.NAME)).value
        val refresh = requireNotNull(response.getCookie(com.hanbit.api.security.AuthCookies.REFRESH_NAME)).value
        // sid 는 access 토큰 payload(claim)에 있다 — 테스트에선 base64 디코드로 꺼낸다.
        val payload = String(java.util.Base64.getUrlDecoder().decode(access.split(".")[1]))
        val sid = mapper.readTree(payload)["sid"].asString()
        return Session(access, refresh, sid)
    }

    private fun me(session: Session) = mvc.get("/api/auth/me") {
        headers { add("Authorization", "Bearer ${session.access}") }
    }

    private fun revoke(actor: Session, targetSid: String) = mvc.delete("/api/auth/sessions/$targetSid") {
        headers { add("Authorization", "Bearer ${actor.access}") }
    }

    @Test
    fun `다른 세션을 무효화하면 그 세션의 access 와 refresh 가 모두 401 이 된다`() {
        val (a, b) = signupAndLoginTwice()
        me(b).andExpect { status { isOk() } }

        revoke(a, b.sid).andExpect {
            status { isOk() }
            jsonPath("$.revoked") { value(true) }
        }

        // 무효화된 세션 B: access 즉시 차단, refresh 재발급도 불가.
        me(b).andExpect { status { isUnauthorized() } }
        mvc.post("/api/auth/refresh") {
            cookie(jakarta.servlet.http.Cookie(com.hanbit.api.security.AuthCookies.REFRESH_NAME, b.refresh))
        }.andExpect { status { isUnauthorized() } }
        // 세션 A 는 영향 없다.
        me(a).andExpect { status { isOk() } }
    }

    @Test
    fun `현재 세션은 원격 로그아웃 대상이 아니다 - 400`() {
        val (a, _) = signupAndLoginTwice()
        revoke(a, a.sid).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `남의 세션이나 모르는 세션은 404`() {
        val (a, _) = signupAndLoginTwice()
        val (other, _) = signupAndLoginTwice()
        revoke(a, other.sid).andExpect { status { isNotFound() } }
        revoke(a, "sid-${UUID.randomUUID()}").andExpect { status { isNotFound() } }
    }

    @Test
    fun `접속 기록 목록이 해지 가능·해지됨 상태를 표시한다`() {
        val (a, b) = signupAndLoginTwice()

        fun listAsA() = mapper.readTree(
            mvc.get("/api/auth/access-logs") {
                headers { add("Authorization", "Bearer ${a.access}") }
            }.andExpect { status { isOk() } }.andReturn().response.contentAsString,
        )["content"]

        val before = listAsA().find { it["sessionId"].asString() == b.sid }!!
        assertThat(before["sessionRevocable"].asBoolean()).isTrue()
        assertThat(before["sessionRevoked"].asBoolean()).isFalse()
        assertThat(before["currentSession"].asBoolean()).isFalse()

        revoke(a, b.sid).andExpect { status { isOk() } }

        val after = listAsA().find { it["sessionId"].asString() == b.sid }!!
        assertThat(after["sessionRevocable"].asBoolean()).isFalse()
        assertThat(after["sessionRevoked"].asBoolean()).isTrue()
    }

    @Test
    fun `다른 세션 모두 로그아웃은 현재 세션만 남긴다`() {
        val email = "revoke-all-${UUID.randomUUID()}@test.com"
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"전체해지"}"""
        }.andExpect { status { isCreated() } }
        val b = login(email)
        val c = login(email)
        val a = login(email) // 현재 세션

        mvc.delete("/api/auth/sessions") {
            headers { add("Authorization", "Bearer ${a.access}") }
        }.andExpect {
            status { isOk() }
            // signup 도 자체 세션을 만들므로 b·c + 가입 세션 = 3.
            jsonPath("$.revokedCount") { value(3) }
        }

        me(b).andExpect { status { isUnauthorized() } }
        me(c).andExpect { status { isUnauthorized() } }
        me(a).andExpect { status { isOk() } }

        // 이미 해지된 세션은 다시 세지 않는다(멱등).
        mvc.delete("/api/auth/sessions") {
            headers { add("Authorization", "Bearer ${a.access}") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.revokedCount") { value(0) }
        }
    }

    @Test
    fun `비밀번호를 변경하면 현재 세션만 남고 다른 세션이 로그아웃된다`() {
        val email = "pwchange-${UUID.randomUUID()}@test.com"
        mvc.post("/api/auth/signup") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"email":"$email","password":"Password1!","name":"변경자"}"""
        }.andExpect { status { isCreated() } }
        val other = login(email)
        val current = login(email)
        me(other).andExpect { status { isOk() } }

        mvc.put("/api/auth/password") {
            headers { add("Authorization", "Bearer ${current.access}") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"currentPassword":"Password1!","newPassword":"NewPassword2!"}"""
        }.andExpect {
            status { isOk() }
            // 가입 세션 + other 세션 = 2 (current 는 제외).
            jsonPath("$.revokedSessions") { value(2) }
        }

        me(other).andExpect { status { isUnauthorized() } }
        me(current).andExpect { status { isOk() } }
    }

    @Test
    fun `비로그인 해지 요청은 401`() {
        mvc.delete("/api/auth/sessions/any-sid").andExpect { status { isUnauthorized() } }
        mvc.delete("/api/auth/sessions").andExpect { status { isUnauthorized() } }
    }
}
