package com.hanbit.api.security

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.security.MessageDigest
import java.time.Duration
import java.time.Instant
import java.util.HexFormat
import java.util.concurrent.ConcurrentHashMap

/**
 * 로그아웃된 access token 을 만료 전까지 차단하는 denylist.
 * 원본 JWT 는 저장하지 않고 SHA-256 hash 만 key 로 쓴다. TTL 은 토큰 남은 만료 시간까지만 유지한다.
 * store 는 rate limit 과 동일한 패턴(app.auth.denylist.store=memory|redis)으로 전환한다.
 */
interface TokenDenylistStore {
    /** ttlSeconds <= 0(이미 만료) 이면 저장하지 않는다. */
    fun deny(tokenHash: String, ttlSeconds: Long)

    fun isDenied(tokenHash: String): Boolean

    /**
     * 원자적 1회 소비 — 아직 등록되지 않았으면 등록하고 true, 이미 등록돼 있으면 false.
     * refresh rotation 의 "한 refresh 토큰은 정확히 한 번만 교환된다" 계약을 저장소 수준에서 보장한다
     * (isDenied→deny 2단계는 병렬 요청이 둘 다 통과하는 레이스가 있었다).
     * ttlSeconds <= 0(이미 만료)이면 소비 불가로 false — 만료 직전 토큰의 이중 사용도 fail-closed.
     */
    fun consume(tokenHash: String, ttlSeconds: Long): Boolean
}

/**
 * 세션(sid) 단위 무효화 키. 개별 토큰 해시와 같은 denylist 를 공유하되 접두사로 구분한다 —
 * 원격 세션 로그아웃 시 그 세션으로 발급된 access·refresh(rotation 포함)가 전부 차단된다.
 */
fun sessionDenyKey(sessionId: String): String = "sid:$sessionId"

/** raw JWT → SHA-256 hex. 원본 토큰을 저장/로그하지 않기 위한 단방향 해시. */
fun hashToken(token: String): String =
    HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.toByteArray()))

private fun redisKey(tokenHash: String) = "denylist:jwt:access:sha256:$tokenHash"

@Component
@ConditionalOnProperty(prefix = "app.auth.denylist", name = ["store"], havingValue = "redis")
class RedisTokenDenylistStore(
    private val redis: StringRedisTemplate,
) : TokenDenylistStore {
    override fun deny(tokenHash: String, ttlSeconds: Long) {
        if (ttlSeconds <= 0) return
        redis.opsForValue().set(redisKey(tokenHash), "1", Duration.ofSeconds(ttlSeconds))
    }

    override fun isDenied(tokenHash: String): Boolean = redis.hasKey(redisKey(tokenHash)) == true

    override fun consume(tokenHash: String, ttlSeconds: Long): Boolean {
        if (ttlSeconds <= 0) return false
        // SET NX EX — 최초 요청만 true. Redis 단일 연산이라 다중 인스턴스에서도 원자적이다.
        return redis.opsForValue().setIfAbsent(redisKey(tokenHash), "1", Duration.ofSeconds(ttlSeconds)) == true
    }
}

@Component
@ConditionalOnProperty(prefix = "app.auth.denylist", name = ["store"], havingValue = "memory", matchIfMissing = true)
class InMemoryTokenDenylistStore : TokenDenylistStore {
    // ponytail: dev/test 전용 store. 재조회되지 않는 항목은 프로세스 재시작까지 남지만, 실사용(local/prod)은 Redis store 다.
    private val denied = ConcurrentHashMap<String, Instant>()

    override fun deny(tokenHash: String, ttlSeconds: Long) {
        if (ttlSeconds <= 0) return
        denied[tokenHash] = Instant.now().plusSeconds(ttlSeconds)
    }

    override fun isDenied(tokenHash: String): Boolean {
        val expiresAt = denied[tokenHash] ?: return false
        if (!Instant.now().isBefore(expiresAt)) {
            denied.remove(tokenHash)
            return false
        }
        return true
    }

    override fun consume(tokenHash: String, ttlSeconds: Long): Boolean {
        if (ttlSeconds <= 0) return false
        val now = Instant.now()
        var consumed = false
        // compute 는 키 단위 원자 — 만료된 기존 항목은 새로 소비할 수 있다(Redis TTL 만료와 동일 의미).
        denied.compute(tokenHash) { _, existing ->
            if (existing == null || !now.isBefore(existing)) {
                consumed = true
                now.plusSeconds(ttlSeconds)
            } else {
                existing
            }
        }
        return consumed
    }
}
