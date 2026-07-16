package com.hanbit.api.notificationws

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
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
        // 인증 세션 식별자(sid). 원격 세션 해지 시 이 세션의 WS 를 골라 끊는 데 쓴다. 레거시 토큰은 null.
        val authSessionId: String?,
    )

    private val conns = ConcurrentHashMap<String, Conn>()

    // userId → 세션 id 집합. deliverToUser 가 전체 커넥션을 스캔하지 않도록 하는 보조 인덱스.
    private val userSessions = ConcurrentHashMap<Long, MutableSet<String>>()

    // 인증 sid → WS 세션 id 집합. 원격 세션 해지 시 해당 WS 를 O(1) 로 찾아 끊는 보조 인덱스.
    private val authSessions = ConcurrentHashMap<String, MutableSet<String>>()

    fun register(session: WebSocketSession, userId: Long, authSessionId: String? = null) {
        // 로컬 커밋 스레드와 Redis relay 스레드가 같은 세션에 동시 sendMessage 하면 프레임이 깨질 수 있어
        // ConcurrentWebSocketSessionDecorator 로 전송을 직렬화한다(버퍼 512KB, 전송 제한 5s).
        val safe = ConcurrentWebSocketSessionDecorator(session, SEND_TIME_LIMIT_MS, BUFFER_SIZE_LIMIT_BYTES)
        conns[session.id] = Conn(safe, userId, authSessionId)
        userSessions.computeIfAbsent(userId) { ConcurrentHashMap.newKeySet() }.add(session.id)
        if (authSessionId != null) {
            authSessions.computeIfAbsent(authSessionId) { ConcurrentHashMap.newKeySet() }.add(session.id)
        }
    }

    fun unregister(session: WebSocketSession) {
        val removed = conns.remove(session.id) ?: return
        userSessions.computeIfPresent(removed.userId) { _, ids ->
            ids.remove(session.id)
            ids.ifEmpty { null }
        }
        removed.authSessionId?.let { sid ->
            authSessions.computeIfPresent(sid) { _, ids ->
                ids.remove(session.id)
                ids.ifEmpty { null }
            }
        }
    }

    /**
     * 원격 세션 해지 시 해당 인증 sid 로 열린 WS 를 즉시 끊는다(POLICY_VIOLATION). denylist 는 HTTP·재연결만
     * 막고 이미 열린 WS 는 재검증하지 않으므로, 끊지 않으면 해지된 세션이 계속 알림 push 를 받는다.
     * 로컬 연결을 끊고, 멀티 인스턴스(Redis fanout)면 다른 replica 에도 close 를 전파한다.
     */
    fun closeAuthSession(authSessionId: String) {
        closeLocalAuthSession(authSessionId)
        // 다른 replica 의 열린 WS 도 끊도록 전파(fanout 없으면 no-op). Redis 실패는 relay 내부에서 삼킨다.
        fanout?.relay(NotificationRelayEnvelope(closeAuthSessionId = authSessionId))
    }

    /** 다른 replica 에서 Redis 로 수신한 close 명령 — 로컬만 끊고 재전파하지 않는다(무한 루프 방지). */
    fun closeAuthSessionFromRelay(authSessionId: String) {
        closeLocalAuthSession(authSessionId)
    }

    private fun closeLocalAuthSession(authSessionId: String) {
        val sessionIds = authSessions[authSessionId] ?: return
        // 순회 중 unregister 가 authSessions 를 수정하므로 스냅샷 복사 후 닫는다.
        // close 실패(decorator lock timeout 등)는 삼켜 다른 세션 close 를 막지 않는다 — 실패 시 인덱스·소켓이
        // 남지만, 그 세션은 denylist 로 push 대상에서 곧 빠지고 클라이언트 재연결 차단·refresh TTL 만료가 백스톱.
        sessionIds.toList().forEach { wsId ->
            conns[wsId]?.session?.let { runCatching { it.close(CloseStatus.POLICY_VIOLATION) } }
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
