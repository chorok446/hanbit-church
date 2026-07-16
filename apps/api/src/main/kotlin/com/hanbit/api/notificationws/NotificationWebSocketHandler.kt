package com.hanbit.api.notificationws

import com.hanbit.api.security.TokenDenylistStore
import com.hanbit.api.security.sessionDenyKey
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
    private val denylist: TokenDenylistStore,
) : TextWebSocketHandler() {
    override fun afterConnectionEstablished(session: WebSocketSession) {
        val userId = session.userId() ?: run {
            session.close(CloseStatus.POLICY_VIOLATION)
            return
        }
        val sid = session.sessionId()
        hub.register(session, userId, sid)
        // TOCTOU 방어: handshake validate 와 register 사이에 이 sid 가 해지됐다면(closeAuthSession 이 등록 전
        // 스냅샷을 떠 놓쳤을 수 있음) 등록 직후 재확인해 끊는다. store 장애는 열어 두고 다음 push·재연결에 맡긴다.
        if (sid != null && runCatching { denylist.isDenied(sessionDenyKey(sid)) }.getOrDefault(false)) {
            session.close(CloseStatus.POLICY_VIOLATION)
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        hub.unregister(session)
    }

    private fun WebSocketSession.userId(): Long? =
        attributes[NotificationHandshakeInterceptor.ATTR_USER_ID] as? Long

    private fun WebSocketSession.sessionId(): String? =
        attributes[NotificationHandshakeInterceptor.ATTR_SESSION_ID] as? String
}
