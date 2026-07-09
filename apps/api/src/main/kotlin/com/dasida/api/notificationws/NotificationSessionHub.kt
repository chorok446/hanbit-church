package com.dasida.api.notificationws

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import tools.jackson.databind.json.JsonMapper
import java.util.concurrent.ConcurrentHashMap

/**
 * 사용자 단위 알림 배지 WS 허브. (DM 제거 전에는 대화·타이핑·프레즌스도 다뤘으나
 * 이제 알림 배지 push 하나만 남았다.)
 */
@Component
class NotificationSessionHub(
    private val mapper: JsonMapper,
) {
    @Autowired(required = false)
    private var fanout: NotificationWsFanout? = null

    private data class Conn(
        val session: WebSocketSession,
        val userId: Long,
    )

    private val conns = ConcurrentHashMap<String, Conn>()

    fun register(session: WebSocketSession, userId: Long) {
        conns[session.id] = Conn(session, userId)
    }

    fun unregister(session: WebSocketSession) {
        conns.remove(session.id)
    }

    /** 알림 배지 갱신 이벤트. 대화와 무관한 사용자 단위 이벤트다. */
    fun publishNotification(userId: Long, payload: NotificationBadgePayload) {
        deliverToUser(userId, envelope(payload))
        fanout?.relay(NotificationRelayEnvelope(userId = userId, payload = payload))
    }

    /** 다른 JVM 인스턴스에서 Redis 로 수신한 이벤트 — 재 fan-out 없음. */
    fun deliverFromRelay(envelope: NotificationRelayEnvelope) {
        val userId = envelope.userId ?: return
        val payload = envelope.payload ?: return
        deliverToUser(userId, envelope(payload))
    }

    private fun deliverToUser(userId: Long, json: String) {
        conns.values
            .filter { it.userId == userId && it.session.isOpen }
            .forEach { send(it.session, json) }
    }

    private fun send(session: WebSocketSession, json: String) {
        if (!session.isOpen) return
        runCatching { session.sendMessage(TextMessage(json)) }
    }

    private fun envelope(payload: NotificationBadgePayload): String =
        mapper.writeValueAsString(
            mapOf(
                "type" to "notification",
                "conversationId" to "",
                "payload" to payload,
            ),
        )
}
