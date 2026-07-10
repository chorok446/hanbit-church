package com.cheolma.api.notificationws

import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import tools.jackson.databind.json.JsonMapper

/** 허브 라우팅 규칙: 수신자에게만, 모든 세션에, 등록 해제·닫힌 세션은 건너뛴다. */
class NotificationSessionHubTest {
    private fun session(id: String, open: Boolean = true): WebSocketSession {
        val session = Mockito.mock(WebSocketSession::class.java)
        Mockito.`when`(session.id).thenReturn(id)
        Mockito.`when`(session.isOpen).thenReturn(open)
        return session
    }

    private val payload = NotificationBadgePayload(unreadCount = 1)

    @Test
    fun `수신자 세션에만 전달되고 다른 사용자 세션은 받지 않는다`() {
        val hub = NotificationSessionHub(JsonMapper())
        val mine = session("s-mine")
        val other = session("s-other")
        hub.register(mine, 1L)
        hub.register(other, 2L)

        hub.publishNotification(1L, payload)

        Mockito.verify(mine).sendMessage(Mockito.any(TextMessage::class.java))
        Mockito.verify(other, Mockito.never()).sendMessage(Mockito.any(TextMessage::class.java))
    }

    @Test
    fun `같은 사용자의 다중 세션(여러 탭)은 모두 수신한다`() {
        val hub = NotificationSessionHub(JsonMapper())
        val tab1 = session("s-1")
        val tab2 = session("s-2")
        hub.register(tab1, 1L)
        hub.register(tab2, 1L)

        hub.publishNotification(1L, payload)

        Mockito.verify(tab1).sendMessage(Mockito.any(TextMessage::class.java))
        Mockito.verify(tab2).sendMessage(Mockito.any(TextMessage::class.java))
    }

    @Test
    fun `등록 해제된 세션은 더 이상 받지 않는다`() {
        val hub = NotificationSessionHub(JsonMapper())
        val session = session("s-1")
        hub.register(session, 1L)
        hub.unregister(session)

        hub.publishNotification(1L, payload)

        Mockito.verify(session, Mockito.never()).sendMessage(Mockito.any(TextMessage::class.java))
    }

    @Test
    fun `닫힌 세션은 건너뛰고 열린 세션에는 계속 전달한다`() {
        val hub = NotificationSessionHub(JsonMapper())
        val closed = session("s-closed", open = false)
        val open = session("s-open")
        hub.register(closed, 1L)
        hub.register(open, 1L)

        hub.publishNotification(1L, payload)

        Mockito.verify(closed, Mockito.never()).sendMessage(Mockito.any(TextMessage::class.java))
        Mockito.verify(open).sendMessage(Mockito.any(TextMessage::class.java))
    }

    @Test
    fun `relay 로 수신한 이벤트는 재발행 없이 세션에 전달된다`() {
        // fanout 은 생성 시 Redis 리스너를 띄우는 클래스라 단위 테스트에서 목킹하지 않는다
        // (Redis 왕복은 REDIS_SMOKE 스모크 테스트 영역). 여기서는 relay 수신 → 세션 전달만 본다.
        val hub = NotificationSessionHub(JsonMapper())
        val session = session("s-1")
        hub.register(session, 1L)

        hub.deliverFromRelay(NotificationRelayEnvelope(userId = 1L, payload = payload))
        hub.deliverFromRelay(NotificationRelayEnvelope(userId = null, payload = payload)) // 잘못된 봉투는 무시

        Mockito.verify(session, Mockito.times(1)).sendMessage(Mockito.any(TextMessage::class.java))
    }
}
