package com.cheolma.api.notification

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.event.Event
import com.cheolma.api.event.EventBody
import com.cheolma.api.event.EventParticipant
import com.cheolma.api.event.EventParticipantRepository
import com.cheolma.api.event.EventRepository
import com.cheolma.api.event.CreateEventCommentRequest
import com.cheolma.api.event.FixedClockTestConfiguration
import com.cheolma.api.event.UpdateEventStatusRequest
import com.cheolma.api.post.Author
import com.cheolma.api.post.CreateCommentRequest
import com.cheolma.api.post.Post
import com.cheolma.api.post.PostRepository
import com.cheolma.api.security.JwtService
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** 도메인 이벤트(게시글/행사 댓글, 행사 참여)에서 알림이 생성/생략되는지 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfiguration::class)
class NotificationEventTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val participants: EventParticipantRepository,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val notifications: NotificationRepository,
) {
    private val owner = 1L
    private val actor = 2L
    private val actorToken = jwt.issue(
        User(id = actor, email = "actor@test.com", passwordHash = "x", name = "행동한사람", verified = false),
    )
    private val ownerToken = jwt.issue(
        User(id = owner, email = "owner@test.com", passwordHash = "x", name = "개설자", verified = true),
    )

    // 동시성 테스트(@Transactional 아님)가 커밋한 알림이 테이블에 남을 수 있어, 전역 count 대신
    // 이 테스트가 만든 고유 엔티티 id(href)로 한정해 단언한다.
    private fun eventsAbout(idFragment: String) = notifications.findAll().filter { it.href.contains(idFragment) }

    private fun savePost(authorUserId: Long?): String {
        val id = "p-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                id = id,
                author = Author("작성자", true),
                time = "방금 전",
                text = "본문",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 0,
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveEvent(authorUserId: Long?, status: String = "open"): String {
        val id = "c-${UUID.randomUUID()}"
        events.saveAndFlush(
            Event(
                id = id,
                status = status,
                title = "행사 제목",
                summary = "요약",
                thumb = "https://example.com/t.png",
                recruitStart = "2026-06-01",
                recruitEnd = "2026-12-31",
                runStart = "2026-07-01",
                runEnd = "2026-12-31",
                capacity = 10,
                joined = 0,
                daysLeftLabel = "모집중",
                author = Author("개설자", true),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun comment(postId: String, bearer: String) = mvc.post("/api/posts/$postId/comments") {
        headers { add("Authorization", "Bearer $bearer") }
        contentType = MediaType.APPLICATION_JSON
        content = mapper.writeValueAsString(CreateCommentRequest("댓글"))
    }

    private fun eventComment(eventId: String, bearer: String) =
        mvc.post("/api/events/$eventId/comments") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateEventCommentRequest("댓글"))
        }

    private fun join(eventId: String, bearer: String) = mvc.post("/api/events/$eventId/join") {
        headers { add("Authorization", "Bearer $bearer") }
    }

    private fun like(postId: String, bearer: String) = mvc.post("/api/posts/$postId/like") {
        headers { add("Authorization", "Bearer $bearer") }
    }

    private fun updateStatus(eventId: String, target: String, bearer: String) =
        mvc.put("/api/events/$eventId/status") {
            headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(UpdateEventStatusRequest(status = target))
        }

    @Test
    fun `내 게시글에 타인이 댓글을 달면 알림이 생성된다`() {
        val postId = savePost(authorUserId = owner)

        val response = comment(postId, actorToken).andExpect { status { isCreated() } }.andReturn()
        val commentId = mapper.readTree(response.response.contentAsString)["id"].asString()

        val list = eventsAbout(postId)
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(owner)
        assertThat(list[0].type).isEqualTo(NotificationType.POST_COMMENT_CREATED)
        assertThat(list[0].href).isEqualTo("/posts/$postId?commentId=$commentId")
        assertThat(list[0].title).contains("테스트 사용자 2")
        assertThat(list[0].readAt).isNull()
    }

    @Test
    fun `내가 내 게시글에 댓글을 달면 알림이 없다`() {
        val postId = savePost(authorUserId = owner)
        comment(postId, ownerToken).andExpect { status { isCreated() } }
        assertThat(eventsAbout(postId)).isEmpty()
    }

    @Test
    fun `authorUserId 없는 게시글 댓글은 알림이 없다`() {
        val postId = savePost(authorUserId = null)
        comment(postId, actorToken).andExpect { status { isCreated() } }
        assertThat(eventsAbout(postId)).isEmpty()
    }

    @Test
    fun `내 행사에 타인이 댓글을 달면 알림이 생성된다`() {
        val eventId = saveEvent(authorUserId = owner)
        val response = eventComment(eventId, actorToken).andExpect { status { isCreated() } }.andReturn()
        val commentId = mapper.readTree(response.response.contentAsString)["id"].asString()

        val list = eventsAbout(eventId)
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(owner)
        assertThat(list[0].type).isEqualTo(NotificationType.EVENT_COMMENT_CREATED)
        assertThat(list[0].href).isEqualTo("/events/$eventId?commentId=$commentId")
    }

    @Test
    fun `내가 내 행사에 댓글을 달면 알림이 없다`() {
        val eventId = saveEvent(authorUserId = owner)
        eventComment(eventId, ownerToken).andExpect { status { isCreated() } }
        assertThat(eventsAbout(eventId)).isEmpty()
    }

    @Test
    fun `내 행사에 타인이 참여하면 알림이 생성된다`() {
        val eventId = saveEvent(authorUserId = owner)
        join(eventId, actorToken).andExpect { status { isOk() } }

        val list = eventsAbout(eventId)
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(owner)
        assertThat(list[0].type).isEqualTo(NotificationType.EVENT_JOINED)
        assertThat(list[0].href).isEqualTo("/events/$eventId/participants")
    }

    @Test
    fun `이미 참여 중인 사용자의 멱등 join은 알림을 추가 생성하지 않는다`() {
        val eventId = saveEvent(authorUserId = owner)
        join(eventId, actorToken).andExpect { status { isOk() } }
        join(eventId, actorToken).andExpect { status { isOk() } }
        assertThat(eventsAbout(eventId)).hasSize(1)
    }

    @Test
    fun `개설자 본인이 참여하면 알림이 없다`() {
        val eventId = saveEvent(authorUserId = owner)
        join(eventId, ownerToken).andExpect { status { isOk() } }
        assertThat(eventsAbout(eventId)).isEmpty()
    }

    @Test
    fun `authorUserId 없는 행사 참여와 댓글은 알림이 없다`() {
        val eventId = saveEvent(authorUserId = null)
        join(eventId, actorToken).andExpect { status { isOk() } }
        eventComment(eventId, actorToken).andExpect { status { isCreated() } }
        assertThat(eventsAbout(eventId)).isEmpty()
    }

    @Test
    fun `내 게시글에 타인이 좋아요를 누르면 알림이 생성된다`() {
        val postId = savePost(authorUserId = owner)
        like(postId, actorToken).andExpect { status { isOk() } }

        val list = eventsAbout(postId)
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(owner)
        assertThat(list[0].type).isEqualTo(NotificationType.POST_LIKED)
        assertThat(list[0].href).isEqualTo("/posts/$postId")
        assertThat(list[0].title).contains("테스트 사용자 2")
        assertThat(list[0].body).isEqualTo("본문")
    }

    @Test
    fun `내가 내 게시글에 좋아요를 누르면 알림이 없다`() {
        val postId = savePost(authorUserId = owner)
        like(postId, ownerToken).andExpect { status { isOk() } }
        assertThat(eventsAbout(postId)).isEmpty()
    }

    @Test
    fun `멱등 좋아요는 알림을 추가 생성하지 않는다`() {
        val postId = savePost(authorUserId = owner)
        like(postId, actorToken).andExpect { status { isOk() } }
        like(postId, actorToken).andExpect { status { isOk() } }
        assertThat(eventsAbout(postId)).hasSize(1)
    }

    @Test
    fun `행사 모집 시작 시 참여자에게 알림이 생성된다`() {
        val eventId = saveEvent(authorUserId = owner, status = "upcoming")
        participants.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, actor))
        updateStatus(eventId, "open", ownerToken).andExpect { status { isOk() } }

        val list = eventsAbout(eventId).filter { it.type == NotificationType.EVENT_STATUS_CHANGED }
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(actor)
        assertThat(list[0].title).isEqualTo("모집이 시작되었습니다")
        assertThat(list[0].body).isEqualTo("행사 제목")
        assertThat(list[0].href).isEqualTo("/events/$eventId")
    }

    @Test
    fun `행사 모집 마감 시 참여자에게 알림이 생성된다`() {
        val eventId = saveEvent(authorUserId = owner, status = "open")
        participants.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, actor))
        updateStatus(eventId, "closed", ownerToken).andExpect { status { isOk() } }

        val list = eventsAbout(eventId).filter { it.type == NotificationType.EVENT_STATUS_CHANGED }
        assertThat(list).hasSize(1)
        assertThat(list[0].userId).isEqualTo(actor)
        assertThat(list[0].title).isEqualTo("모집이 마감되었습니다")
    }

    @Test
    fun `행사 알림을 끈 참여자는 상태 변경 알림을 받지 않는다`() {
        val eventId = saveEvent(authorUserId = owner, status = "upcoming")
        participants.saveAndFlush(EventParticipant("cp-${UUID.randomUUID()}", eventId, actor))
        val actorUser = users.findById(actor).get()
        actorUser.notifyEventUpdates = false
        users.saveAndFlush(actorUser)

        updateStatus(eventId, "open", ownerToken).andExpect { status { isOk() } }
        assertThat(eventsAbout(eventId).filter { it.type == NotificationType.EVENT_STATUS_CHANGED }).isEmpty()
    }
}
