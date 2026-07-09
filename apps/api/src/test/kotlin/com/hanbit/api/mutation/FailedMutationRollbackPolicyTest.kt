package com.hanbit.api.mutation

import com.hanbit.api.auth.User
import com.hanbit.api.event.Event
import com.hanbit.api.event.EventBody
import com.hanbit.api.event.EventComment
import com.hanbit.api.event.EventCommentRepository
import com.hanbit.api.event.EventParticipantRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.event.CreateEventCommentRequest
import com.hanbit.api.event.FixedClockTestConfiguration
import com.hanbit.api.post.Author
import com.hanbit.api.post.CreateCommentRequest
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostBookmark
import com.hanbit.api.post.PostBookmarkRepository
import com.hanbit.api.post.PostComment
import com.hanbit.api.post.PostCommentRepository
import com.hanbit.api.post.PostLike
import com.hanbit.api.post.PostLikeRepository
import com.hanbit.api.post.PostRepository
import com.hanbit.api.report.CreateReportRequest
import com.hanbit.api.report.ReportRepository
import com.hanbit.api.security.JwtService
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

/**
 * 실패한 mutation 이후 도메인 데이터 롤백/무변경 회귀 방지.
 *
 * 기존 ControllerTest·PR #75/#77/#83 은 실패 HTTP status 를, PR #84 는 알림 미생성을 고정한다.
 * 여기서는 mutation 이 validation·상태 충돌·참조 오류로 실패했을 때 댓글·신고·참여·좋아요/북마크 row 와
 * 집계·목록 API 관찰 결과가 변하지 않음만 대표 경로로 고정한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(FixedClockTestConfiguration::class)
class FailedMutationRollbackPolicyTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val postComments: PostCommentRepository,
    @param:Autowired private val likes: PostLikeRepository,
    @param:Autowired private val bookmarks: PostBookmarkRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val eventComments: EventCommentRepository,
    @param:Autowired private val participants: EventParticipantRepository,
    @param:Autowired private val reports: ReportRepository,
) {
    private val actor = 2L
    private val actorToken = jwt.issue(
        User(id = actor, email = "actor@test.com", passwordHash = "x", name = "행동한사람", verified = false),
    )

    private fun savePost(likes: Int = 0, comments: Int = 1, authorUserId: Long? = 1): String {
        val id = "fm-post-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                id, Author("작성자", false), "방금", "본문", emptyList(), emptyList(), likes, comments,
                seq = System.nanoTime(), authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun savePostComment(
        postId: String,
        id: String = "fm-pc-${UUID.randomUUID()}",
        text: String = "기존 댓글",
        authorUserId: Long = 1,
    ): String {
        postComments.saveAndFlush(
            PostComment(
                id = id,
                postId = postId,
                author = Author("댓글작성자", false),
                text = text,
                time = "방금",
                seq = System.nanoTime(),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveEvent(
        status: String = "open",
        capacity: Int = 10,
        joined: Int = 0,
        authorUserId: Long? = 1,
    ): String {
        val id = "fm-camp-${UUID.randomUUID()}"
        events.saveAndFlush(
            Event(
                id, status, "행사", "요약", "",
                "2026-07-01", "2026-07-31", "2026-08-01", "2026-08-31",
                capacity, joined, "모집중", Author("개설자", false),
                EventBody("소개", emptyList(), emptyList()),
                seq = System.nanoTime(), authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveEventComment(
        eventId: String,
        id: String = "fm-cc-${UUID.randomUUID()}",
        text: String = "기존 행사 댓글",
        authorUserId: Long? = 9,
    ): String {
        eventComments.saveAndFlush(
            EventComment(
                id = id,
                eventId = eventId,
                author = Author("댓글작성자", false),
                text = text,
                createdAt = Instant.parse("2026-07-01T00:00:00Z"),
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveReportTargetPost(): String {
        val postId = "fm-report-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                postId, Author("작성자", false), "방금", "신고 대상", emptyList(), emptyList(), 0, 0,
                seq = System.nanoTime(), authorUserId = 9,
            ),
        )
        return postId
    }

    @Test
    fun `게시글 blank 댓글 작성 실패 후 기존 댓글과 집계와 목록이 변하지 않는다`() {
        val postId = savePost(comments = 1)
        val existingId = savePostComment(postId, text = "유지할 댓글")
        val beforeCount = postComments.countByPostId(postId)
        val beforeCommentsField = posts.findById(postId).orElseThrow().comments

        mvc.post("/api/posts/$postId/comments") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateCommentRequest("   "))
        }.andExpect { status { isBadRequest() } }

        assertThat(postComments.countByPostId(postId)).isEqualTo(beforeCount)
        assertThat(posts.findById(postId).orElseThrow().comments).isEqualTo(beforeCommentsField)
        assertThat(postComments.findById(existingId).orElseThrow().text).isEqualTo("유지할 댓글")
        mvc.get("/api/posts/$postId/comments/page").andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(beforeCount) }
            jsonPath("$.content[0].id") { value(existingId) }
        }
        mvc.get("/api/posts/$postId").andExpect { jsonPath("$.comments") { value(beforeCommentsField) } }
    }

    @Test
    fun `존재하지 않는 게시글 댓글 작성 실패 후 댓글 row가 생기지 않는다`() {
        val controlPostId = savePost(comments = 0)
        val beforeCount = postComments.countByPostId(controlPostId)

        mvc.post("/api/posts/nope-${UUID.randomUUID()}/comments") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateCommentRequest("댓글"))
        }.andExpect { status { isNotFound() } }

        assertThat(postComments.countByPostId(controlPostId)).isEqualTo(beforeCount)
    }

    @Test
    fun `행사 blank 댓글 작성 실패 후 기존 댓글 row가 유지된다`() {
        val eventId = saveEvent()
        val existingId = saveEventComment(eventId, text = "남아야 할 댓글")
        val beforeCount = eventComments.countByEventId(eventId)

        mvc.post("/api/events/$eventId/comments") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateEventCommentRequest("   "))
        }.andExpect { status { isBadRequest() } }

        assertThat(eventComments.countByEventId(eventId)).isEqualTo(beforeCount)
        assertThat(eventComments.findById(existingId).orElseThrow().text).isEqualTo("남아야 할 댓글")
    }

    @Test
    fun `잘못된 신고 입력 실패 후 신고 row가 증가하지 않는다`() {
        val postId = saveReportTargetPost()
        val beforeCount = reports.count()

        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("post", postId, "SPAM", null))
        }.andExpect { status { isBadRequest() } }
        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("POST", postId, "UNKNOWN", null))
        }.andExpect { status { isBadRequest() } }
        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("POST", " ", "SPAM", null))
        }.andExpect { status { isBadRequest() } }

        assertThat(reports.count()).isEqualTo(beforeCount)
    }

    @Test
    fun `존재하지 않는 대상 신고 실패 후 신고 row가 증가하지 않는다`() {
        val beforeCount = reports.count()

        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(
                CreateReportRequest("POST", "fm-missing-${UUID.randomUUID()}", "SPAM", null),
            )
        }.andExpect { status { isNotFound() } }

        assertThat(reports.count()).isEqualTo(beforeCount)
    }

    @Test
    fun `EVENT_COMMENT 중복 신고 실패 후 기존 신고 1건만 유지된다`() {
        val eventId = saveEvent()
        val commentId = saveEventComment(eventId)

        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("EVENT_COMMENT", commentId, "SPAM", null))
        }.andExpect { status { isCreated() } }

        mvc.post("/api/reports") {
            headers { add("Authorization", "Bearer $actorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(CreateReportRequest("EVENT_COMMENT", commentId, "ABUSE", null))
        }.andExpect { status { isConflict() } }

        assertThat(
            reports.findAll().count {
                it.reporterUserId == actor && it.targetType == "EVENT_COMMENT" && it.targetId == commentId
            },
        ).isEqualTo(1)
    }

    @Test
    fun `정원 마감 행사 참여 실패 후 participant와 joined가 변하지 않는다`() {
        val eventId = saveEvent(capacity = 5, joined = 5)
        val beforeParticipants = participants.countByEventId(eventId)
        val beforeJoined = events.findById(eventId).orElseThrow().joined

        mvc.post("/api/events/$eventId/join") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect { status { isConflict() } }

        assertThat(participants.countByEventId(eventId)).isEqualTo(beforeParticipants)
        assertThat(events.findById(eventId).orElseThrow().joined).isEqualTo(beforeJoined)
        mvc.get("/api/events/$eventId") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.joined") { value(beforeJoined) }
            jsonPath("$.joinedByMe") { value(false) }
        }
    }

    @Test
    fun `모집 중이 아닌 행사 참여 실패 후 participant와 joined가 변하지 않는다`() {
        val eventId = saveEvent(status = "closed", joined = 0)
        val beforeParticipants = participants.countByEventId(eventId)
        val beforeJoined = events.findById(eventId).orElseThrow().joined

        mvc.post("/api/events/$eventId/join") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect { status { is4xxClientError() } }

        assertThat(participants.countByEventId(eventId)).isEqualTo(beforeParticipants)
        assertThat(events.findById(eventId).orElseThrow().joined).isEqualTo(beforeJoined)
        mvc.get("/api/events/$eventId") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.joinedByMe") { value(false) }
        }
    }

    @Test
    fun `없는 게시글 좋아요 실패 후 기존 게시글 like row와 likes 집계가 변하지 않는다`() {
        val postId = savePost(likes = 2)
        likes.saveAndFlush(PostLike("fm-like", postId, actor))
        val beforeLikes = posts.findById(postId).orElseThrow().likes
        val beforeLikeRows = likes.countByPostId(postId)

        mvc.post("/api/posts/nope-${UUID.randomUUID()}/like") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect { status { isNotFound() } }

        assertThat(likes.countByPostId(postId)).isEqualTo(beforeLikeRows)
        assertThat(posts.findById(postId).orElseThrow().likes).isEqualTo(beforeLikes)
        mvc.get("/api/posts/$postId") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.likes") { value(beforeLikes) }
            jsonPath("$.likedByMe") { value(true) }
        }
    }

    @Test
    fun `없는 게시글 북마크 실패 후 기존 bookmark row가 변하지 않는다`() {
        val postId = savePost()
        bookmarks.saveAndFlush(PostBookmark("fm-bmk", postId, actor))
        val beforeBookmarkRows = bookmarks.countByPostId(postId)

        mvc.post("/api/posts/nope-${UUID.randomUUID()}/bookmark") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect { status { isNotFound() } }

        assertThat(bookmarks.countByPostId(postId)).isEqualTo(beforeBookmarkRows)
        mvc.get("/api/posts/$postId") {
            headers { add("Authorization", "Bearer $actorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.bookmarkedByMe") { value(true) }
        }
    }
}
