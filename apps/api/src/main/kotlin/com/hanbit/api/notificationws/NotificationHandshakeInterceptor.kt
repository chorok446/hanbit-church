package com.hanbit.api.notificationws

import com.hanbit.api.security.AccessTokenValidator
import com.hanbit.api.security.authCookieToken
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.HandshakeInterceptor

@Component
class NotificationHandshakeInterceptor(
    private val validator: AccessTokenValidator,
) : HandshakeInterceptor {
    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>,
    ): Boolean {
        val servlet = (request as? ServletServerHttpRequest)?.servletRequest ?: return false
        // httpOnly 인증 쿠키만 사용한다 — ?token= 쿼리 파라미터는 URL·프록시·접속 로그에 JWT 를 남기므로 제거했다.
        val token = servlet.authCookieToken() ?: return false
        return try {
            // HTTP 필터와 동일 정책: denylist·sid 해지·탈퇴·정지까지 공통 validator 로 검증한다.
            val validated = validator.validate(token)
            attributes[ATTR_USER_ID] = validated.principal.id
            true
        } catch (_: Exception) {
            false
        }
    }

    override fun afterHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        exception: Exception?,
    ) = Unit

    companion object {
        const val ATTR_USER_ID = "notificationWsUserId"
    }
}
