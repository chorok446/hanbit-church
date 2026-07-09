package com.cheolma.api.auth

import com.cheolma.api.event.Event
import com.cheolma.api.post.Author
import com.cheolma.api.event.EventBody
import com.cheolma.api.event.EventComment
import com.cheolma.api.event.EventCommentRepository
import com.cheolma.api.event.EventRepository
import com.cheolma.api.post.Post
import com.cheolma.api.post.PostComment
import com.cheolma.api.post.PostCommentRepository
import com.cheolma.api.post.PostRepository
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 프로필 수정이 기존 작성물(게시글·행사·양쪽 댓글)의 author snapshot 에 전파되는지 검증.
 * 스냅샷이 갱신되지 않으면 프로필 이미지를 등록해도 목록/상세에서 기본 아바타가 계속 보인다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProfileSyncAuthorTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val posts: PostRepository,
    @param:Autowired val postComments: PostCommentRepository,
    @param:Autowired val events: EventRepository,
    @param:Autowired val eventComments: EventCommentRepository,
) {

    @Test
    fun `프로필 수정은 기존 작성물의 author snapshot 에 이름과 이미지를 전파한다`() {
        val user = users.saveAndFlush(
            User(email = "sync@cheolma.com", passwordHash = "hash", name = "기존이름", verified = true),
        )
        val userId = requireNotNull(user.id)
        val other = users.saveAndFlush(
            User(email = "other@cheolma.com", passwordHash = "hash", name = "남의이름", verified = false),
        )
        val otherId = requireNotNull(other.id)

        val postId = "sync-p-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                postId, Author("기존이름", true), "방금", "본문",
                emptyList(), emptyList(), likes = 0, comments = 0, seq = 1, authorUserId = userId,
            ),
        )
        val otherPostId = "sync-p-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                otherPostId, Author("남의이름", false), "방금", "남의 글",
                emptyList(), emptyList(), likes = 0, comments = 0, seq = 2, authorUserId = otherId,
            ),
        )
        val commentId = "sync-pc-${UUID.randomUUID()}"
        postComments.saveAndFlush(
            PostComment(commentId, postId, Author("기존이름", true), "댓글", "방금", seq = 1, authorUserId = userId),
        )
        val eventId = "sync-c-${UUID.randomUUID()}"
        events.saveAndFlush(
            Event(
                id = eventId, status = "upcoming", title = "행사", summary = "요약",
                thumb = "https://example.com/thumb.png",
                recruitStart = "2026-07-01", recruitEnd = "2026-07-31",
                runStart = "2026-08-01", runEnd = "2026-08-31",
                capacity = 10, joined = 0, daysLeftLabel = "모집예정",
                author = Author("기존이름", true),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = 1, authorUserId = userId,
            ),
        )
        val eventCommentId = "sync-cc-${UUID.randomUUID()}"
        eventComments.saveAndFlush(
            EventComment(eventCommentId, eventId, Author("기존이름", true), "댓글", Instant.now(), authorUserId = userId),
        )

        mvc.put("/api/auth/me") {
            headers { add("Authorization", "Bearer ${jwt.issue(user)}") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"name":"새이름","profileImageUrl":"https://example.com/new.png"}"""
        }.andExpect { status { isOk() } }

        val syncedPost = posts.findById(postId).get()
        assertThat(syncedPost.author.name).isEqualTo("새이름")
        assertThat(syncedPost.author.profileImageUrl).isEqualTo("https://example.com/new.png")
        // verified 는 전파 대상이 아니다
        assertThat(syncedPost.author.verified).isTrue()

        assertThat(postComments.findById(commentId).get().author.profileImageUrl)
            .isEqualTo("https://example.com/new.png")
        assertThat(events.findById(eventId).get().author.profileImageUrl)
            .isEqualTo("https://example.com/new.png")
        assertThat(eventComments.findById(eventCommentId).get().author.profileImageUrl)
            .isEqualTo("https://example.com/new.png")

        // 다른 사용자의 작성물은 그대로
        val untouched = posts.findById(otherPostId).get()
        assertThat(untouched.author.name).isEqualTo("남의이름")
        assertThat(untouched.author.profileImageUrl).isNull()
    }

    @Test
    fun `프로필 이미지를 제거하면 작성물 snapshot 이미지도 제거된다`() {
        val user = users.saveAndFlush(
            User(
                email = "sync-clear@cheolma.com", passwordHash = "hash", name = "이름",
                verified = false, profileImageUrl = "https://example.com/old.png",
            ),
        )
        val userId = requireNotNull(user.id)
        val postId = "sync-p-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                postId, Author("이름", false, "https://example.com/old.png"), "방금", "본문",
                emptyList(), emptyList(), likes = 0, comments = 0, seq = 1, authorUserId = userId,
            ),
        )

        mvc.put("/api/auth/me") {
            headers { add("Authorization", "Bearer ${jwt.issue(user)}") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"name":"이름","profileImageUrl":null}"""
        }.andExpect { status { isOk() } }

        assertThat(posts.findById(postId).get().author.profileImageUrl).isNull()
    }
}
