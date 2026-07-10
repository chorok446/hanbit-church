package com.cheolma.api.report

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.event.Event
import com.cheolma.api.event.EventBody
import com.cheolma.api.event.EventComment
import com.cheolma.api.event.EventCommentRepository
import com.cheolma.api.event.EventRepository
import com.cheolma.api.notification.NotificationRepository
import com.cheolma.api.post.Author
import com.cheolma.api.post.Post
import com.cheolma.api.post.PostComment
import com.cheolma.api.post.PostCommentRepository
import com.cheolma.api.post.PostRepository
import com.cheolma.api.security.JwtService
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReportControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val reports: ReportRepository,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val postComments: PostCommentRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val eventComments: EventCommentRepository,
    @param:Autowired private val notifications: NotificationRepository,
    @param:Autowired private val users: UserRepository,
) {
    private val reporterToken = jwt.issue(
        User(id = 1, email = "reporter@test.com", passwordHash = "x", name = "신고자"),
    )
    private val otherToken = jwt.issue(
        User(id = 2, email = "other-reporter@test.com", passwordHash = "x", name = "다른 신고자"),
    )

    private data class Targets(
        val postId: String,
        val postCommentId: String,
        val eventId: String,
        val eventCommentId: String,
    )

    private fun saveTargets(authorUserId: Long? = 9): Targets {
        val suffix = UUID.randomUUID().toString()
        val postId = "report-post-$suffix"
        val postCommentId = "report-post-comment-$suffix"
        val eventId = "report-event-$suffix"
        val eventCommentId = "report-event-comment-$suffix"
        posts.saveAndFlush(
            Post(
                id = postId,
                author = Author("작성자", false),
                time = "방금",
                text = "신고 대상 게시글",
                tags = emptyList(),
                images = emptyList(),
                likes = 0,
                comments = 1,
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        postComments.saveAndFlush(
            PostComment(
                id = postCommentId,
                postId = postId,
                author = Author("댓글 작성자", false),
                text = "신고 대상 댓글",
                time = "방금",
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        events.saveAndFlush(
            Event(
                id = eventId,
                status = "open",
                title = "신고 대상 행사",
                summary = "요약",
                thumb = "",
                recruitStart = "2026-07-01",
                recruitEnd = "2026-07-31",
                runStart = "2026-08-01",
                runEnd = "2026-08-31",
                capacity = 10,
                joined = 0,
                daysLeftLabel = "모집중",
                author = Author("개설자", false),
                body = EventBody("소개", emptyList(), emptyList()),
                seq = 1,
                authorUserId = authorUserId,
            ),
        )
        eventComments.saveAndFlush(
            EventComment(
                id = eventCommentId,
                eventId = eventId,
                author = Author("댓글 작성자", false),
                text = "신고 대상 행사 댓글",
                createdAt = Instant.parse("2026-07-01T00:00:00Z"),
                authorUserId = authorUserId,
            ),
        )
        return Targets(postId, postCommentId, eventId, eventCommentId)
    }

    private fun createReport(
        targetType: String,
        targetId: String,
        reason: String = "SPAM",
        detail: String? = " 반복 광고입니다. ",
        bearer: String? = reporterToken,
    ) = mvc.post("/api/reports") {
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        contentType = MediaType.APPLICATION_JSON
        content = mapper.writeValueAsString(CreateReportRequest(targetType, targetId, reason, detail))
    }

    @Test
    fun `비로그인 신고와 내 신고 목록은 401`() {
        val target = saveTargets()

        createReport("POST", target.postId, bearer = null).andExpect { status { isUnauthorized() } }
        mvc.get("/api/reports/mine").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `게시글 행사과 각 댓글을 신고하면 201이고 작성자 식별자는 노출하지 않는다`() {
        val target = saveTargets()

        listOf(
            "POST" to target.postId,
            "POST_COMMENT" to target.postCommentId,
            "EVENT" to target.eventId,
            "EVENT_COMMENT" to target.eventCommentId,
        ).forEach { (type, id) ->
            createReport(type, id).andExpect {
                status { isCreated() }
                jsonPath("$.targetType") { value(type) }
                jsonPath("$.targetId") { value(id) }
                jsonPath("$.reason") { value("SPAM") }
                jsonPath("$.detail") { value("반복 광고입니다.") }
                jsonPath("$.time") { isNotEmpty() }
                jsonPath("$.reporterUserId") { doesNotExist() }
                jsonPath("$.authorUserId") { doesNotExist() }
            }
        }

        assertThat(reports.count()).isEqualTo(4)
    }

    @Test
    fun `허용되지 않은 타입 사유와 잘못된 입력은 400`() {
        val target = saveTargets()

        createReport("post", target.postId).andExpect { status { isBadRequest() } }
        createReport("POST", target.postId, reason = "UNKNOWN").andExpect { status { isBadRequest() } }
        createReport("POST", " ").andExpect { status { isBadRequest() } }
        createReport("POST", target.postId, detail = "a".repeat(501)).andExpect { status { isBadRequest() } }
    }

    @Test
    fun `blank detail은 null로 저장하고 없는 대상은 404`() {
        val target = saveTargets()

        createReport("POST", target.postId, detail = "   ").andExpect {
            status { isCreated() }
            jsonPath("$.detail") { value(null) }
        }
        createReport("POST", "missing-report-target").andExpect { status { isNotFound() } }
    }

    @Test
    fun `본인이 작성한 모든 대상은 신고할 수 없다`() {
        val target = saveTargets(authorUserId = 1)

        listOf(
            "POST" to target.postId,
            "POST_COMMENT" to target.postCommentId,
            "EVENT" to target.eventId,
            "EVENT_COMMENT" to target.eventCommentId,
        ).forEach { (type, id) ->
            createReport(type, id).andExpect { status { isBadRequest() } }
        }
        assertThat(reports.count()).isZero()
    }

    @Test
    fun `legacy와 탈퇴 사용자 콘텐츠는 신고할 수 있다`() {
        val legacy = saveTargets(authorUserId = null)
        val deleted = saveTargets(authorUserId = 9)
        users.findById(9).orElseThrow().deletedAt = Instant.now()
        users.flush()

        createReport("POST", legacy.postId).andExpect { status { isCreated() } }
        createReport("EVENT", deleted.eventId).andExpect { status { isCreated() } }
    }

    @Test
    fun `같은 사용자의 같은 대상 중복 신고는 409지만 사용자 타입 대상이 다르면 허용한다`() {
        val target = saveTargets()
        val sameId = "report-shared-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(
                sameId,
                Author("작성자", false),
                "방금",
                "본문",
                emptyList(),
                emptyList(),
                0,
                0,
                seq = 2,
                authorUserId = 9,
            ),
        )
        events.saveAndFlush(
            Event(
                sameId, "open", "행사", "요약", "",
                "2026-07-01", "2026-07-31", "2026-08-01", "2026-08-31",
                10, 0, "모집중", Author("작성자", false),
                EventBody("소개", emptyList(), emptyList()),
                seq = 2,
                authorUserId = 9,
            ),
        )

        createReport("POST", target.postId).andExpect { status { isCreated() } }
        createReport("POST", target.postId).andExpect { status { isConflict() } }
        assertThat(
            reports.findAll().count {
                it.reporterUserId == 1L && it.targetType == "POST" && it.targetId == target.postId
            },
        ).isEqualTo(1)
        createReport("POST", target.postId, bearer = otherToken).andExpect { status { isCreated() } }
        createReport("EVENT", target.eventId).andExpect { status { isCreated() } }
        createReport("POST", sameId).andExpect { status { isCreated() } }
        createReport("EVENT", sameId).andExpect { status { isCreated() } }
    }

    @Test
    fun `신고 성공은 알림과 원본 콘텐츠를 변경하지 않는다`() {
        val target = saveTargets()
        val notificationCount = notifications.count()

        createReport("POST", target.postId).andExpect { status { isCreated() } }

        assertThat(notifications.count()).isEqualTo(notificationCount)
        assertThat(posts.findById(target.postId).orElseThrow().text).isEqualTo("신고 대상 게시글")
        assertThat(events.findById(target.eventId).orElseThrow().title).isEqualTo("신고 대상 행사")
    }

    @Test
    fun `내 신고 목록은 최신순으로 내 신고만 pagination한다`() {
        val target = saveTargets()
        reports.saveAllAndFlush(
            listOf(
                Report("report-old", 1, "POST", target.postId, "SPAM", null, "old", 1),
                Report("report-new", 1, "EVENT", target.eventId, "OTHER", "상세", "new", 3),
                Report("report-other", 2, "POST", target.postId, "ABUSE", null, "other", 4),
            ),
        )

        mvc.get("/api/reports/mine") {
            headers { add("Authorization", "Bearer $reporterToken") }
            param("page", "0")
            param("size", "1")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(1) }
            jsonPath("$.content[0].id") { value("report-new") }
            jsonPath("$.page") { value(0) }
            jsonPath("$.size") { value(1) }
            jsonPath("$.totalElements") { value(2) }
            jsonPath("$.totalPages") { value(2) }
        }
    }

    @Test
    fun `내 신고 목록 page와 size 경계를 검증한다`() {
        listOf("page=-1", "size=0", "size=101").forEach { query ->
            mvc.get("/api/reports/mine?$query") {
                headers { add("Authorization", "Bearer $reporterToken") }
            }.andExpect { status { isBadRequest() } }
        }
    }
}
