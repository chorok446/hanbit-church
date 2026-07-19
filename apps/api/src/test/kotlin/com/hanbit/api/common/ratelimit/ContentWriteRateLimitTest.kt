package com.hanbit.api.common.ratelimit

import com.hanbit.api.auth.User
import com.hanbit.api.event.Event
import com.hanbit.api.event.EventBody
import com.hanbit.api.event.EventRepository
import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostRepository
import com.hanbit.api.report.CreateReportRequest
import com.hanbit.api.security.JwtService
import tools.jackson.databind.json.JsonMapper
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(
    properties = [
        "app.rate-limit.store=memory",
        "app.rate-limit.content.comment.limit=2",
        "app.rate-limit.content.report.limit=2",
        "app.rate-limit.content.media.limit=2",
        "app.rate-limit.content.create.limit=2",
        "app.rate-limit.content.comment.window-seconds=60",
        "app.rate-limit.content.report.window-seconds=60",
        "app.rate-limit.content.media.window-seconds=60",
        "app.rate-limit.content.create.window-seconds=60",
        "app.rate-limit.auth.login.limit=10000",
        "app.rate-limit.auth.signup.limit=10000",
    ],
)
class ContentWriteRateLimitTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val postRepo: PostRepository,
) {
    private val token = jwt.issue(
        User(id = 1, email = "content-rate@test.com", passwordHash = "x", name = "작성자", verified = true),
    )

    @Test
    fun `행사 댓글 작성은 IP당 limit 초과 시 429를 반환한다`() {
        val eventId = saveEvent()
        repeat(2) { i ->
            postComment("/api/events/$eventId/comments", """{"text":"댓글 $i"}""", "203.0.113.10")
                .andExpect { status { isCreated() } }
        }
        postComment("/api/events/$eventId/comments", """{"text":"한도 초과"}""", "203.0.113.10")
            .andExpect {
                status { isTooManyRequests() }
                header { exists("Retry-After") }
            }
    }

    @Test
    fun `게시글 댓글 작성은 IP당 limit 초과 시 429를 반환한다`() {
        val postId = savePost()
        repeat(2) { i ->
            postComment("/api/posts/$postId/comments", """{"text":"댓글 $i"}""", "203.0.113.11")
                .andExpect { status { isCreated() } }
        }
        postComment("/api/posts/$postId/comments", """{"text":"한도 초과"}""", "203.0.113.11")
            .andExpect {
                status { isTooManyRequests() }
                header { exists("Retry-After") }
            }
    }

    @Test
    fun `게시글 생성은 IP당 limit 초과 시 429를 반환한다`() {
        // 회귀 가드: POST /api/posts·/api/events(본문 생성)는 댓글·상호작용과 달리 rate limit 이 비어
        // 있었다. CONTENT_CREATE 버킷 공유(행사 생성도 같은 규칙), 전용 IP 로 격리.
        fun createPost() = mvc.post("/api/posts") {
            headers {
                add("Authorization", "Bearer $token")
                add("X-Forwarded-For", "203.0.113.15")
            }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"본문"}"""
        }
        repeat(2) { createPost().andExpect { status { isCreated() } } }
        createPost().andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
        }
    }

    @Test
    fun `신고 생성은 IP당 limit 초과 시 429를 반환한다`() {
        repeat(2) {
            val postId = savePost()
            mvc.post("/api/reports") {
                headers {
                    add("Authorization", "Bearer $token")
                    add("X-Forwarded-For", "203.0.113.12")
                }
                contentType = MediaType.APPLICATION_JSON
                content = mapper.writeValueAsString(CreateReportRequest("POST", postId, "SPAM"))
            }.andExpect { status { isCreated() } }
        }
        val postId = savePost()
        mvc.post("/api/reports") {
            headers {
                add("Authorization", "Bearer $token")
                add("X-Forwarded-For", "203.0.113.12")
            }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("POST", postId, "SPAM"))
        }.andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
        }
    }

    @Test
    fun `새가족 공개 등록은 IP당 신고 버킷 limit 초과 시 429를 반환한다`() {
        // 회귀 가드: /api/new-family 는 비로그인 공개 POST 라 rate limit 이 유일한 스팸/DoS 방어다.
        // 등록 패턴에서 빠지면 필터 미실행 → 무제한 등록. REPORT_CREATE(limit=2) 버킷 공유, 전용 IP 로 격리.
        val body = """{"name":"새가족","phone":"010-0000-0000","note":""}"""
        repeat(2) {
            mvc.post("/api/new-family") {
                headers { add("X-Forwarded-For", "203.0.113.30") }
                contentType = MediaType.APPLICATION_JSON
                content = body
            }
        }
        mvc.post("/api/new-family") {
            headers { add("X-Forwarded-For", "203.0.113.30") }
            contentType = MediaType.APPLICATION_JSON
            content = body
        }.andExpect {
            status { isTooManyRequests() }
            header { exists("Retry-After") }
        }
    }

    @Test
    fun `이미지 업로드는 IP당 limit 초과 시 429를 반환한다`() {
        // 실제 디코딩 가능한 PNG — 업로드가 정상 처리(200)돼야 rate limit(초과 시 429)을 검증할 수 있다.
        val pngBytes = java.io.ByteArrayOutputStream().also {
            javax.imageio.ImageIO.write(
                java.awt.image.BufferedImage(8, 8, java.awt.image.BufferedImage.TYPE_INT_RGB), "png", it,
            )
        }.toByteArray()
        repeat(2) {
            mvc.perform(
                multipart("/api/media")
                    .file(MockMultipartFile("file", "photo.png", "image/png", pngBytes))
                    .header("Authorization", "Bearer $token")
                    .header("X-Forwarded-For", "203.0.113.14"),
            ).andExpect(status().isOk)
        }
        mvc.perform(
            multipart("/api/media")
                .file(MockMultipartFile("file", "photo.png", "image/png", pngBytes))
                .header("Authorization", "Bearer $token")
                .header("X-Forwarded-For", "203.0.113.14"),
        )
            .andExpect(status().isTooManyRequests)
            .andExpect(header().exists("Retry-After"))
    }

    @Test
    fun `댓글 조회와 신고 목록 조회에는 rate limit이 적용되지 않는다`() {
        val eventId = saveEvent()
        val postId = savePost()
        repeat(5) {
            mvc.get("/api/events/$eventId/comments") {
                headers {
                    add("Authorization", "Bearer $token")
                    add("X-Forwarded-For", "203.0.113.13")
                }
            }.andExpect { status { isOk() } }
            mvc.get("/api/reports/mine") {
                headers {
                    add("Authorization", "Bearer $token")
                    add("X-Forwarded-For", "203.0.113.13")
                }
            }.andExpect { status { isOk() } }
            mvc.get("/api/posts/$postId/comments") {
                headers {
                    add("Authorization", "Bearer $token")
                    add("X-Forwarded-For", "203.0.113.13")
                }
            }.andExpect { status { isOk() } }
        }
    }

    private fun postComment(path: String, body: String, clientIp: String) =
        mvc.post(path) {
            headers {
                add("Authorization", "Bearer $token")
                add("X-Forwarded-For", clientIp)
            }
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    private fun saveEvent(): String {
        val id = "rl-event-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id = id,
                status = "upcoming",
                title = "rate limit 행사",
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
                seq = System.nanoTime(),
                authorUserId = 9,
            ),
        )
        return id
    }

    private fun savePost(): String {
        val id = "rl-post-${UUID.randomUUID()}"
        postRepo.saveAndFlush(
            Post(
                id = id,
                author = Author("작성자", false),
                time = "방금",
                text = "rate limit 게시글",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                seq = System.nanoTime(),
                authorUserId = 9,
            ),
        )
        return id
    }
}
