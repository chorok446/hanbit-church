package com.cheolma.api.notificationws

import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.TextWebSocketHandler

/**
 * 알림 배지 WS 핸들러. 클라이언트는 인바운드 프레임을 보내지 않으며(구독/타이핑 제거됨),
 * 서버가 사용자 단위 알림 배지 이벤트만 push 한다.
 */
@Component
class NotificationWebSocketHandler(
    private val hub: NotificationSessionHub,
) : TextWebSocketHandler() {
    override fun afterConnectionEstablished(session: WebSocketSession) {
        val userId = session.userId() ?: run {
            session.close(CloseStatus.POLICY_VIOLATION)
            return
        }
        hub.register(session, userId)
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        hub.unregister(session)
    }

    private fun WebSocketSession.userId(): Long? =
        attributes[NotificationHandshakeInterceptor.ATTR_USER_ID] as? Long
}
