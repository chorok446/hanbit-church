package com.dasida.api.notificationws

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator
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

    // userId → 세션 id 집합. deliverToUser 가 전체 커넥션을 스캔하지 않도록 하는 보조 인덱스.
    private val userSessions = ConcurrentHashMap<Long, MutableSet<String>>()

    fun register(session: WebSocketSession, userId: Long) {
        // 로컬 커밋 스레드와 Redis relay 스레드가 같은 세션에 동시 sendMessage 하면 프레임이 깨질 수 있어
        // ConcurrentWebSocketSessionDecorator 로 전송을 직렬화한다(버퍼 512KB, 전송 제한 5s).
        val safe = ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES)
        conns[session.id] = Conn(safe, userId)
        userSessions.computeIfAbsent(userId) { ConcurrentHashMap.newKeySet() }.add(session.id)
    }

    fun unregister(session: WebSocketSession) {
        val removed = conns.remove(session.id) ?: return
        userSessions.computeIfPresent(removed.userId) { _, ids ->
            ids.remove(session.id)
            ids.ifEmpty { null }
        }
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
        val sessionIds = userSessions[userId] ?: return
        sessionIds.forEach { sessionId ->
            conns[sessionId]?.session?.let { send(it, json) }
        }
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

    private companion object {
        const val SEND_TIME_LIMIT_MS = 5_000
        const val BUFFER_SIZE_LIMIT_BYTES = 512 * 1024
    }
}
