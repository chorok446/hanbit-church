package com.hanbit.api.event

import com.hanbit.api.auth.User
import com.hanbit.api.post.Author
import com.hanbit.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.post
import java.util.UUID
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@SpringBootTest
@AutoConfigureMockMvc
class EventCommentConcurrencyTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val participantRepo: EventParticipantRepository,
    @param:Autowired private val commentRepo: EventCommentRepository,
) {
    private fun tokenFor(userId: Long) = jwt.issue(
        User(id = userId, email = "comment-$userId@test.com", passwordHash = "x", name = "유저$userId", verified = false),
    )

    private fun saveEvent(ownerId: Long): String {
        val id = "comment-concurrency-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id = id,
                status = "upcoming",
                title = "동시성 행사",
                summary = "요약",
                thumb = "https://example.com/thumb.png",
                recruitStart = "2026-07-01",
                recruitEnd = "2026-07-31",
                runStart = "2026-08-01",
                runEnd = "2026-08-31",
                capacity = 10,
                joined = 0,
                daysLeftLabel = "모집예정",
                author = Author("개설자", false),
                body = EventBody("소개", emptyList(), emptyList()),
                authorUserId = ownerId,
            ),
        )
        return id
    }

    private fun createStatus(eventId: String, token: String): Int =
        mvc.post("/api/events/$eventId/comments") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"동시에 작성한 댓글"}"""
        }.andReturn().response.status

    private fun deleteStatus(eventId: String, token: String): Int =
        mvc.delete("/api/events/$eventId") {
            headers { add("Authorization", "Bearer $token") }
        }.andReturn().response.status

    private fun runConcurrently(first: () -> Int, second: () -> Int): Pair<Int, Int> {
        val barrier = CyclicBarrier(2)
        val pool = Executors.newFixedThreadPool(2)
        try {
            val firstResult = pool.submit(Callable { barrier.await(5, TimeUnit.SECONDS); first() })
            val secondResult = pool.submit(Callable { barrier.await(5, TimeUnit.SECONDS); second() })
            return firstResult.get(15, TimeUnit.SECONDS) to secondResult.get(15, TimeUnit.SECONDS)
        } finally {
            pool.shutdownNow()
        }
    }

    @Test
    fun `댓글 작성과 행사 삭제가 동시에 실행돼도 orphan 댓글이 남지 않는다`() {
        val ownerId = 901L
        val eventId = saveEvent(ownerId)
        try {
            val (createResult, deleteResult) = runConcurrently(
                { createStatus(eventId, tokenFor(902L)) },
                { deleteStatus(eventId, tokenFor(ownerId)) },
            )

            assertThat(createResult).isIn(201, 404)
            assertThat(deleteResult).isEqualTo(204)
            // soft delete: 행사 row 는 남지만 deletedAt 마킹으로 모든 경로가 404 → 댓글이 먼저
            // 커밋됐더라도(201) orphan 이 노출될 경로가 없다.
            assertThat(eventRepo.findById(eventId).orElseThrow().deletedAt).isNotNull()
        } finally {
            commentRepo.deleteByEventId(eventId)
            participantRepo.deleteByEventId(eventId)
            eventRepo.deleteById(eventId)
        }
    }
}
