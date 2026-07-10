package com.cheolma.api.authorization

import com.cheolma.api.auth.User
import com.cheolma.api.event.Event
import com.cheolma.api.event.EventBody
import com.cheolma.api.event.EventComment
import com.cheolma.api.event.EventCommentRepository
import com.cheolma.api.event.EventRepository
import com.cheolma.api.post.Author
import com.cheolma.api.post.Post
import com.cheolma.api.post.PostComment
import com.cheolma.api.post.PostCommentRepository
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
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 도메인 권한 경계 회귀 방지.
 *
 * 게시글/댓글/행사/행사 댓글의 수정·삭제 권한은 **리소스 소유자(게시글·행사 authorUserId)** 가 아니라
 * **작성자(댓글 authorUserId)** 기준으로 판정한다. 각 도메인 ControllerTest 가 타인(403)과 legacy(403)를
 * 이미 고정하지만, "부모 리소스 소유자 ≠ 댓글 작성자" 경계는 아직 명시적으로 고정되지 않았다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DomainAuthorizationBoundaryTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val postComments: PostCommentRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val eventComments: EventCommentRepository,
) {
    private val user1Token = jwt.issue(User(id = 1, email = "owner@test.com", passwordHash = "x", name = "소유자", verified = false))
    private val user2Token = jwt.issue(User(id = 2, email = "commenter@test.com", passwordHash = "x", name = "댓글러", verified = false))

    private fun savePost(authorUserId: Long = 1): String {
        val id = "auth-post-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                id = id,
                author = Author("소유자", false),
                time = "방금",
                text = "본문",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 1,
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun savePostComment(postId: String, authorUserId: Long?): String {
        val id = "auth-pc-${UUID.randomUUID()}"
        postComments.saveAndFlush(
            PostComment(
                id = id,
                postId = postId,
                author = Author("댓글러", false),
                text = "원래 댓글",
                time = "방금",
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveEvent(authorUserId: Long = 1): String {
        val id = "auth-camp-${UUID.randomUUID()}"
        events.saveAndFlush(
            Event(
                id = id,
                status = "upcoming",
                title = "행사",
                summary = "요약",
                thumb = "",
                recruitStart = "2026-07-01",
                recruitEnd = "2026-07-31",
                runStart = "2026-08-01",
                runEnd = "2026-08-31",
                capacity = 10,
                joined = 0,
                daysLeftLabel = "모집중",
                author = Author("소유자", false),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveEventComment(eventId: String, authorUserId: Long?): String {
        val id = "auth-cc-${UUID.randomUUID()}"
        eventComments.saveAndFlush(
            EventComment(
                id = id,
                eventId = eventId,
                author = Author("댓글러", false),
                text = "원래 댓글",
                createdAt = Instant.now(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    @Test
    fun `게시글 작성자는 다른 사용자 댓글 수정을 403으로 거부한다`() {
        val postId = savePost(authorUserId = 1)
        val commentId = savePostComment(postId, authorUserId = 2)

        mvc.put("/api/posts/$postId/comments/$commentId") {
            headers { add("Authorization", "Bearer $user1Token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"침입 수정"}"""
        }.andExpect { status { isForbidden() } }

        assertThat(postComments.findById(commentId).orElseThrow().text).isEqualTo("원래 댓글")
        assertThat(postComments.findById(commentId).orElseThrow().updatedAt).isNull()
    }

    @Test
    fun `게시글 작성자는 다른 사용자 댓글 삭제를 403으로 거부한다`() {
        val postId = savePost(authorUserId = 1)
        val commentId = savePostComment(postId, authorUserId = 2)

        mvc.delete("/api/posts/$postId/comments/$commentId") {
            headers { add("Authorization", "Bearer $user1Token") }
        }.andExpect { status { isForbidden() } }

        assertThat(postComments.existsById(commentId)).isTrue()
        assertThat(posts.findById(postId).orElseThrow().comments).isEqualTo(1)
    }

    @Test
    fun `행사 개설자는 다른 사용자 댓글 수정을 403으로 거부한다`() {
        val eventId = saveEvent(authorUserId = 1)
        val commentId = saveEventComment(eventId, authorUserId = 2)

        mvc.put("/api/events/$eventId/comments/$commentId") {
            headers { add("Authorization", "Bearer $user1Token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"침입 수정"}"""
        }.andExpect { status { isForbidden() } }

        assertThat(eventComments.findById(commentId).orElseThrow().text).isEqualTo("원래 댓글")
        assertThat(eventComments.findById(commentId).orElseThrow().updatedAt).isNull()
    }

    @Test
    fun `행사 개설자는 다른 사용자 댓글 삭제를 403으로 거부한다`() {
        val eventId = saveEvent(authorUserId = 1)
        val commentId = saveEventComment(eventId, authorUserId = 2)

        mvc.delete("/api/events/$eventId/comments/$commentId") {
            headers { add("Authorization", "Bearer $user1Token") }
        }.andExpect { status { isForbidden() } }

        assertThat(eventComments.existsById(commentId)).isTrue()
    }

    @Test
    fun `authorUserId가 null인 행사 댓글 삭제는 403이다`() {
        val eventId = saveEvent(authorUserId = 1)
        val commentId = saveEventComment(eventId, authorUserId = null)

        mvc.delete("/api/events/$eventId/comments/$commentId") {
            headers { add("Authorization", "Bearer $user1Token") }
        }.andExpect { status { isForbidden() } }

        assertThat(eventComments.existsById(commentId)).isTrue()
    }
}
