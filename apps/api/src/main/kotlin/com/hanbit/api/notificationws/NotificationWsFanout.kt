package com.hanbit.api.notificationws

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Lazy
import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.listener.ChannelTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/** Redis pub/sub — 다중 API replica 간 알림 배지 이벤트 fan-out. local(compose) 에서만 활성. */
@Component
@ConditionalOnProperty(prefix = "app.dm.ws", name = ["fanout"], havingValue = "redis")
class NotificationWsFanout(
    private val redis: StringRedisTemplate,
    private val mapper: JsonMapper,
    @Lazy private val hub: NotificationSessionHub,
) : MessageListener, AutoCloseable {
    private val instanceId = UUID.randomUUID().toString()
    private val container = RedisMessageListenerContainer().apply {
        setConnectionFactory(redis.connectionFactory!!)
        addMessageListener(this@NotificationWsFanout, ChannelTopic(CHANNEL))
        afterPropertiesSet()
        start()
    }

    fun relay(envelope: NotificationRelayEnvelope) {
        // Redis 실패해도 로컬 WS·DB 트랜잭션은 유지 (side-channel fan-out)
        runCatching {
            redis.convertAndSend(CHANNEL, mapper.writeValueAsString(envelope.copy(origin = instanceId)))
        }
    }

    override fun onMessage(message: Message, pattern: ByteArray?) {
        val envelope = runCatching {
            mapper.readValue(message.body, NotificationRelayEnvelope::class.java)
        }.getOrNull() ?: return
        if (envelope.origin == instanceId) return
        // 세션 해지 전파는 close 명령, 그 외는 알림 배지 전달 — 봉투는 둘 중 하나만 채워진다.
        envelope.closeAuthSessionId?.let { hub.closeAuthSessionFromRelay(it); return }
        hub.deliverFromRelay(envelope)
    }

    override fun close() {
        container.stop()
    }

    companion object {
        const val CHANNEL = "hanbit:notification:ws"
    }
}
