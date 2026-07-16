package com.hanbit.api.security

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** in-memory denylist store 와 token hash 동작을 Spring 컨텍스트 없이 검증. */
class TokenDenylistStoreTest {
    private val store = InMemoryTokenDenylistStore()

    @Test
    fun `등록한 토큰 해시는 차단되고 미등록 해시는 통과한다`() {
        val hash = hashToken("some.jwt.token")
        assertFalse(store.isDenied(hash))
        store.deny(hash, 60)
        assertTrue(store.isDenied(hash))
    }

    @Test
    fun `이미 만료된 토큰(ttl 0 이하)은 저장하지 않는다`() {
        val hash = hashToken("expired.jwt.token")
        store.deny(hash, 0)
        assertFalse(store.isDenied(hash))
        store.deny(hash, -5)
        assertFalse(store.isDenied(hash))
    }

    @Test
    fun `TTL 이 지나면 다시 통과한다`() {
        val hash = hashToken("short.jwt.token")
        store.deny(hash, 1)
        assertTrue(store.isDenied(hash))
        Thread.sleep(1100) // 초 단위 TTL 이라 1초+ 대기 후 만료 확인
        assertFalse(store.isDenied(hash))
    }

    @Test
    fun `hashToken 은 원본을 노출하지 않는 64자 hex 다`() {
        val h = hashToken("secret-token")
        assertTrue(h.matches(Regex("[0-9a-f]{64}")))
        assertFalse(h.contains("secret-token"))
    }

    @Test
    fun `consume 은 최초 한 번만 성공하고 이후에는 실패한다`() {
        val hash = hashToken("rotation.jwt.token")
        assertTrue(store.consume(hash, 60))
        assertFalse(store.consume(hash, 60))
        // 소비된 토큰은 denylist 에도 등록돼 있다(재사용 차단과 동일 저장소).
        assertTrue(store.isDenied(hash))
    }

    @Test
    fun `consume 은 ttl 0 이하(만료 토큰)를 소비 불가로 거절한다`() {
        val hash = hashToken("expired.rotation.token")
        assertFalse(store.consume(hash, 0))
        assertFalse(store.consume(hash, -5))
        assertFalse(store.isDenied(hash))
    }

    @Test
    fun `만료된 기존 항목은 다시 consume 할 수 있다`() {
        val hash = hashToken("short.rotation.token")
        assertTrue(store.consume(hash, 1))
        Thread.sleep(1100)
        assertTrue(store.consume(hash, 60))
    }

    @Test
    fun `동일 해시 병렬 consume 은 정확히 하나만 성공한다`() {
        val hash = hashToken("parallel.rotation.token")
        val threads = 16
        val ready = java.util.concurrent.CountDownLatch(threads)
        val start = java.util.concurrent.CountDownLatch(1)
        val successes = java.util.concurrent.atomic.AtomicInteger(0)
        val pool = java.util.concurrent.Executors.newFixedThreadPool(threads)
        repeat(threads) {
            pool.submit {
                ready.countDown()
                start.await()
                if (store.consume(hash, 60)) successes.incrementAndGet()
            }
        }
        ready.await()
        start.countDown() // 전 스레드 동시 출발 — isDenied→deny 2단계였다면 다중 성공이 재현되는 지점
        pool.shutdown()
        assertTrue(pool.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS))
        kotlin.test.assertEquals(1, successes.get())
    }
}
