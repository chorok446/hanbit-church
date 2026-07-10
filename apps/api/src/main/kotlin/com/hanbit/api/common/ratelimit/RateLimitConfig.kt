package com.hanbit.api.common.ratelimit

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Configuration
@EnableConfigurationProperties(RateLimitProperties::class)
class RateLimitConfig {
    @Bean
    fun authRateLimitFilterRegistration(filter: AuthRateLimitFilter): FilterRegistrationBean<AuthRateLimitFilter> =
        FilterRegistrationBean(filter).apply {
            order = Ordered.HIGHEST_PRECEDENCE + 50
            addUrlPatterns("/api/auth/login", "/api/auth/signup")
        }

    @Bean
    fun contentWriteRateLimitFilterRegistration(
        filter: ContentWriteRateLimitFilter,
    ): FilterRegistrationBean<ContentWriteRateLimitFilter> =
        FilterRegistrationBean(filter).apply {
            order = Ordered.HIGHEST_PRECEDENCE + 51
            addUrlPatterns("/api/reports", "/api/posts/*", "/api/events/*", "/api/media", "/api/media/document")
        }
}

@Component
@ConditionalOnProperty(prefix = "app.rate-limit", name = ["store"], havingValue = "redis")
class RedisRateLimitBucketStore(
    private val redis: StringRedisTemplate,
) : RateLimitBucketStore {
    override fun tryConsume(key: String, limit: Int, windowSeconds: Long): RateLimitResult {
        // INCR 와 EXPIRE 를 Lua 로 원자 실행한다. 예전엔 INCR 후 별도 EXPIRE 라, 그 사이 프로세스가 죽으면
        // TTL 없는 키가 남아 해당 IP/계정이 영구 차단될 수 있었다.
        @Suppress("UNCHECKED_CAST")
        val result = redis.execute(CONSUME_SCRIPT, listOf(key), windowSeconds.toString()) as? List<Long>
        val count = result?.getOrNull(0) ?: 1L
        val ttlSeconds = (result?.getOrNull(1) ?: windowSeconds).coerceAtLeast(0)
        val allowed = count <= limit
        val remaining = (limit - count).coerceAtLeast(0).toInt()
        val retryAfter = if (allowed) 0L else ttlSeconds.coerceAtLeast(1)
        return RateLimitResult(
            allowed = allowed,
            limit = limit,
            remaining = remaining,
            retryAfterSeconds = retryAfter,
        )
    }

    private companion object {
        // 첫 증가일 때만 TTL 을 건다. 반환: {count, ttl(seconds)}.
        val CONSUME_SCRIPT: DefaultRedisScript<List<*>> = DefaultRedisScript(
            """
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return {count, redis.call('TTL', KEYS[1])}
            """.trimIndent(),
            List::class.java,
        )
    }
}

@Component
@ConditionalOnProperty(prefix = "app.rate-limit", name = ["store"], havingValue = "memory", matchIfMissing = true)
class InMemoryRateLimitBucketStore : RateLimitBucketStore {
    private data class Window(var count: Int, val resetAt: java.time.Instant)

    private val buckets = ConcurrentHashMap<String, Window>()

    override fun tryConsume(key: String, limit: Int, windowSeconds: Long): RateLimitResult {
        val now = java.time.Instant.now()
        val window =
            buckets.compute(key) { _, existing ->
                if (existing == null || !now.isBefore(existing.resetAt)) {
                    Window(count = 1, resetAt = now.plusSeconds(windowSeconds))
                } else {
                    existing.count += 1
                    existing
                }
            }!!
        val allowed = window.count <= limit
        val remaining = (limit - window.count).coerceAtLeast(0)
        val retryAfter =
            if (allowed) {
                0L
            } else {
                java.time.Duration.between(now, window.resetAt).seconds.coerceAtLeast(1)
            }
        return RateLimitResult(
            allowed = allowed,
            limit = limit,
            remaining = remaining,
            retryAfterSeconds = retryAfter,
        )
    }
}
