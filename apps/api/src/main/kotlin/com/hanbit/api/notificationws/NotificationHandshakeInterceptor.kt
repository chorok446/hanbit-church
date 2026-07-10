package com.hanbit.api.notificationws

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.security.JwtService
import com.hanbit.api.security.TokenDenylistStore
import com.hanbit.api.security.authCookieToken
import com.hanbit.api.security.hashToken
import org.springframework.http.server.ServerHttpRequest
import org.springframework.http.server.ServerHttpResponse
import org.springframework.http.server.ServletServerHttpRequest
import org.springframework.stereotype.Component
import org.springframework.web.socket.WebSocketHandler
import org.springframework.web.socket.server.HandshakeInterceptor

@Component
class NotificationHandshakeInterceptor(
    private val jwt: JwtService,
    private val users: UserRepository,
    private val denylist: TokenDenylistStore,
) : HandshakeInterceptor {
    override fun beforeHandshake(
        request: ServerHttpRequest,
        response: ServerHttpResponse,
        wsHandler: WebSocketHandler,
        attributes: MutableMap<String, Any>,
    ): Boolean {
        val servlet = (request as? ServletServerHttpRequest)?.servletRequest ?: return false
        val token = servlet.authCookieToken()
            ?: servlet.getParameter("token")?.takeIf { it.isNotBlank() }
            ?: return false
        return try {
            if (denylist.isDenied(hashToken(token))) return false
            val user = jwt.parse(token)
            val stored = users.findById(user.id).orElse(null) ?: return false
            if (stored.deletedAt != null) return false
            attributes[ATTR_USER_ID] = user.id
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
