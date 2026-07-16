package com.hanbit.api.notificationws

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.security.AuthCookies
import com.hanbit.api.security.JwtService
import com.hanbit.api.security.TokenDenylistStore
import com.hanbit.api.security.hashToken
import com.hanbit.api.security.sessionDenyKey
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.http.server.ServletServerHttpResponse
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.socket.WebSocketHandler
import java.time.Instant
import java.util.UUID

/**
 * /ws/messages 핸드셰이크 인증: 유효 토큰만 통과하고 사용자 id 를 세션 속성에 싣는다.
 * denylist(로그아웃) 토큰·탈퇴 사용자·토큰 없음은 전부 거절.
 */
@SpringBootTest
@Transactional
class NotificationHandshakeInterceptorTest(
    @param:Autowired private val interceptor: NotificationHandshakeInterceptor,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val denylist: TokenDenylistStore,
) {
    private fun saveUser(deleted: Boolean = false, suspended: Boolean = false): User = users.saveAndFlush(
        User(
            email = "ws-${UUID.randomUUID()}@hanbit.com",
            passwordHash = "x",
            name = "WS테스트",
            deletedAt = if (deleted) Instant.now() else null,
            suspendedUntil = if (suspended) Instant.now().plusSeconds(3600) else null,
        ),
    )

    // 인증은 httpOnly 쿠키로만 받는다(?token= 쿼리 파라미터는 제거됨).
    private fun handshake(token: String?): Pair<Boolean, MutableMap<String, Any>> {
        val servlet = MockHttpServletRequest("GET", "/ws/messages")
        if (token != null) servlet.setCookies(jakarta.servlet.http.Cookie(AuthCookies.NAME, token))
        val attributes = mutableMapOf<String, Any>()
        val ok = interceptor.beforeHandshake(
            ServletServerHttpRequest(servlet),
            ServletServerHttpResponse(MockHttpServletResponse()),
            Mockito.mock(WebSocketHandler::class.java),
            attributes,
        )
        return ok to attributes
    }

    @Test
    fun `유효 토큰이면 통과하고 사용자 id 를 세션 속성에 싣는다`() {
        val user = saveUser()
        val (ok, attributes) = handshake(jwt.issue(user))
        assertThat(ok).isTrue()
        assertThat(attributes[NotificationHandshakeInterceptor.ATTR_USER_ID]).isEqualTo(user.id)
    }

    @Test
    fun `토큰이 없거나 깨졌으면 거절한다`() {
        assertThat(handshake(null).first).isFalse()
        assertThat(handshake("broken-token").first).isFalse()
    }

    @Test
    fun `로그아웃(denylist)된 토큰은 거절한다`() {
        val token = jwt.issue(saveUser())
        denylist.deny(hashToken(token), ttlSeconds = 600)
        assertThat(handshake(token).first).isFalse()
    }

    @Test
    fun `탈퇴한 사용자는 유효 토큰이어도 거절한다`() {
        val token = jwt.issue(saveUser(deleted = true))
        assertThat(handshake(token).first).isFalse()
    }

    @Test
    fun `원격 해지된 세션(sid)의 토큰은 거절한다`() {
        val sid = "sid-${UUID.randomUUID()}"
        val token = jwt.issue(saveUser(), sessionId = sid)
        // 정상 sid 는 통과.
        assertThat(handshake(token).first).isTrue()
        // 세션 해지 후에는 같은 토큰이라도 거절 — HTTP 필터와 동일한 sid denylist 정책.
        denylist.deny(sessionDenyKey(sid), ttlSeconds = 600)
        assertThat(handshake(token).first).isFalse()
    }

    @Test
    fun `정지된 사용자는 유효 토큰이어도 거절한다`() {
        val token = jwt.issue(saveUser(suspended = true))
        assertThat(handshake(token).first).isFalse()
    }
}
