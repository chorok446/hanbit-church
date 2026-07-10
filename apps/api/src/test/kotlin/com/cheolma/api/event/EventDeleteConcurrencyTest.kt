package com.cheolma.api.event

import com.cheolma.api.auth.User
import com.cheolma.api.post.Author
import com.cheolma.api.post.PostRepository
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * 행사 삭제의 동시성을 실제 두 thread 로 검증. 클래스에 @Transactional 을 붙이지 않아
 * worker 가 commit 된 데이터를 보고 각자 별도 트랜잭션/커넥션으로 event row lock 을 경쟁한다.
 * 시작은 CyclicBarrier 로 맞추고(Thread.sleep 미사용), future/executor 에 timeout 을 둔다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EventDeleteConcurrencyTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val eventRepo: EventRepository,
    @param:Autowired val participantRepo: EventParticipantRepository,
    @param:Autowired val postRepo: PostRepository,
) {
    private fun tokenFor(userId: Long) = jwt.issue(
        User(id = userId, email = "u$userId@t.com", passwordHash = "x", name = "유저$userId", verified = false),
    )

    /** 삭제 가능한 깨끗한 upcoming 행사(참여자·연결 게시글 없음)을 commit 상태로 저장. */
    private fun saveDeletableEvent(ownerId: Long): String {
        val id = "conc-del-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id, "upcoming", "삭제 대상", "요약", "https://x/y.png",
                "2026-07-01", "2026-07-31", "2026-08-05", "2026-08-30",
                10, 0, "모집예정", Author("개설자", false),
                EventBody("소개", emptyList(), emptyList()),
                authorUserId = ownerId,
            ),
        )
        return id
    }

    private fun deleteStatus(id: String, token: String): Int =
        mvc.delete("/api/events/$id") {
            headers { add("Authorization", "Bearer $token") }
        }.andReturn().response.status

    private fun openStatus(id: String, token: String): Int =
        mvc.put("/api/events/$id/status") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"status":"open"}"""
        }.andReturn().response.status

    private fun createLinkedPostStatus(eventId: String, token: String): Int =
        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"동시 생성 게시글","eventId":"$eventId"}"""
        }.andReturn().response.status

    private fun <A, B> runConcurrently(first: () -> A, second: () -> B): Pair<A, B> {
        val barrier = CyclicBarrier(2)
        val pool = Executors.newFixedThreadPool(2)
        try {
            val fa = pool.submit(Callable { barrier.await(5, TimeUnit.SECONDS); first() })
            val fb = pool.submit(Callable { barrier.await(5, TimeUnit.SECONDS); second() })
            return fa.get(10, TimeUnit.SECONDS) to fb.get(10, TimeUnit.SECONDS)
        } finally {
            pool.shutdownNow()
        }
    }

    private fun cleanup(id: String) {
        // orphan 여부와 무관하게 연결 게시글 → participant → event 순으로 정리.
        postRepo.deleteAll(postRepo.findAll().filter { it.eventId == id })
        participantRepo.deleteByEventId(id)
        eventRepo.deleteById(id)
    }

    @Test
    fun `동시 삭제와 모집 시작은 row lock으로 직렬화된다`() {
        val ownerId = 501L
        val ownerToken = tokenFor(ownerId)
        val id = saveDeletableEvent(ownerId)
        try {
            val (deleteResult, openResult) = runConcurrently(
                { deleteStatus(id, ownerToken) },
                { openStatus(id, ownerToken) },
            )

            // 허용 결과: {204,404}(삭제 우선) 또는 {409,200}(모집 시작 우선)
            if (deleteResult == 204) {
                assertThat(openResult).isEqualTo(404)
                // soft delete: row 는 남고 deletedAt 마킹으로 없는 것으로 취급된다.
                assertThat(eventRepo.findById(id).get().deletedAt).isNotNull()
            } else {
                assertThat(deleteResult).isEqualTo(409)
                assertThat(openResult).isEqualTo(200)
                assertThat(eventRepo.findById(id).get().status).isEqualTo("open") // 삭제된 open 불가
            }
        } finally {
            cleanup(id)
        }
    }

    @Test
    fun `동시 삭제와 연결 게시글 생성은 orphan을 만들지 않는다`() {
        val ownerId = 601L
        val ownerToken = tokenFor(ownerId)
        val authorToken = tokenFor(602L)
        val id = saveDeletableEvent(ownerId)
        try {
            val (deleteResult, createResult) = runConcurrently(
                { deleteStatus(id, ownerToken) },
                { createLinkedPostStatus(id, authorToken) },
            )

            // soft delete: row 는 남으므로 "존재"는 deletedAt == null 로 판정한다.
            val eventExists = eventRepo.findById(id).map { it.deletedAt == null }.orElse(false)
            val linkedPostExists = postRepo.existsByEventId(id)
            // 절대 금지: 게시글은 있는데 행사은 없는 orphan 상태.
            assertThat(linkedPostExists && !eventExists).isFalse()

            // 허용 결과: {204,400}(삭제 우선) 또는 {409,201}(게시글 생성 우선)
            if (createResult == 201) {
                assertThat(deleteResult).isEqualTo(409)
                assertThat(eventExists).isTrue()
                assertThat(linkedPostExists).isTrue()
            } else {
                assertThat(createResult).isEqualTo(400)
                assertThat(deleteResult).isEqualTo(204)
                assertThat(eventExists).isFalse()
                assertThat(linkedPostExists).isFalse()
            }
        } finally {
            cleanup(id)
        }
    }
}
