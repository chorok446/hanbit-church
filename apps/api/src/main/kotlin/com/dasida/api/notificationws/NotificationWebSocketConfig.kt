package com.dasida.api.notificationws

import com.dasida.api.security.CorsProperties
import org.springframework.context.annotation.Configuration
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry

/**
 * WS 엔드포인트 경로는 `/ws/messages` 를 유지한다(프론트 notification-ws.ts 가 하드코딩).
 * 이제 DM 이 아니라 알림 배지 전용 채널이다.
 */
@Configuration
@EnableWebSocket
class NotificationWebSocketConfig(
    private val handler: NotificationWebSocketHandler,
    private val auth: NotificationHandshakeInterceptor,
    private val cors: CorsProperties,
) : WebSocketConfigurer {
    override fun registerWebSocketHandlers(registry: WebSocketHandlerRegistry) {
        registry.addHandler(handler, "/ws/messages")
            .addInterceptors(auth)
            .setAllowedOrigins(*cors.sanitizedOrigins().toTypedArray())
    }
}
