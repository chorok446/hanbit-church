package com.hanbit.api.admin

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.event.Event
import com.hanbit.api.event.EventBody
import com.hanbit.api.event.EventComment
import com.hanbit.api.event.EventCommentRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.notification.NotificationRepository
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.post.Author
import com.hanbit.api.post.Post
import com.hanbit.api.post.PostComment
import com.hanbit.api.post.PostCommentRepository
import com.hanbit.api.post.PostRepository
import com.hanbit.api.post.SCHEDULED_HIDDEN_REASON
import com.hanbit.api.report.Report
import com.hanbit.api.report.ReportRepository
import com.hanbit.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.time.Instant
import java.util.UUID

/** 관리자 콘텐츠 숨김/복구와 공개 노출 필터의 통합 동작 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminContentVisibilityTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val posts: PostRepository,
    @param:Autowired private val postComments: PostCommentRepository,
    @param:Autowired private val events: EventRepository,
    @param:Autowired private val eventComments: EventCommentRepository,
    @param:Autowired private val reports: ReportRepository,
    @param:Autowired private val notifications: NotificationRepository,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "관리자"),
    )
    private val authorToken = jwt.issue(
        User(id = 9, email = "test-user-9@hanbit.local", passwordHash = "x", name = "작성자"),
    )
    private val otherToken = jwt.issue(
        User(id = 2, email = "test-user-2@hanbit.local", passwordHash = "x", name = "일반 사용자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun savePost(authorUserId: Long? = 9, comments: Int = 0): Post = posts.saveAndFlush(
        Post(
            id = "vis-post-${UUID.randomUUID()}",
            author = Author("작성자", false),
            time = "방금",
            text = "숨김 대상 게시글",
            tags = emptyList(),
            images = emptyList(),
            likes = 0,
            comments = comments,
            seq = System.nanoTime(),
            authorUserId = authorUserId,
        ),
    )

    /** 예약 게시 대기 글 — publishAt(미래) + hiddenAt/hiddenReason 마커. 생성 시 PostService 가 세팅하는 상태를 재현. */
    private fun saveScheduledPost(authorUserId: Long? = 9): Post {
        val post = savePost(authorUserId = authorUserId)
        post.publishAt = Instant.now().plusSeconds(3600)
        post.hiddenAt = Instant.now()
        post.hiddenReason = SCHEDULED_HIDDEN_REASON
        return posts.saveAndFlush(post)
    }

    private fun saveComment(postId: String, authorUserId: Long? = 9): PostComment = postComments.saveAndFlush(
        PostComment(
            id = "vis-pc-${UUID.randomUUID()}",
            postId = postId,
            author = Author("작성자", false),
            text = "숨김 대상 댓글",
            time = "방금",
            seq = System.nanoTime(),
            authorUserId = authorUserId,
        ),
    )

    private fun saveEvent(authorUserId: Long? = 9): Event = events.saveAndFlush(
        Event(
            "vis-camp-${UUID.randomUUID()}", "open", "숨김 대상 행사", "요약", "",
            "2026-07-01", "2026-07-31", "2026-08-01", "2026-08-31",
            10, 0, "모집중", Author("작성자", false),
            EventBody("소개", emptyList(), emptyList()),
            seq = System.nanoTime(),
            authorUserId = authorUserId,
        ),
    )

    private fun setVisibility(targetType: String, targetId: String, hidden: Boolean, reason: String? = null, bearer: String? = adminToken) =
        mvc.patch("/api/admin/content/$targetType/$targetId") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(SetContentVisibilityRequest(hidden, reason))
        }

    @Test
    fun `숨김 복구 API는 비로그인 401 일반 사용자 403`() {
        val post = savePost()
        setVisibility("POST", post.id, true, bearer = null).andExpect { status { isUnauthorized() } }
        setVisibility("POST", post.id, true, bearer = otherToken).andExpect { status { isForbidden() } }
    }

    @Test
    fun `게시글 숨김은 공개 목록 검색 sitemap 상세에서 제외하고 작성자 상세만 허용한다`() {
        val post = savePost()
        setVisibility("POST", post.id, true, reason = "광고 게시글").andExpect {
            status { isOk() }
            jsonPath("$.hidden") { value(true) }
        }

        mvc.get("/api/posts").andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '${post.id}')]") { isEmpty() }
        }
        mvc.get("/api/posts/search?q=숨김 대상 게시글").andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '${post.id}')]") { isEmpty() }
        }
        mvc.get("/api/posts/sitemap-ids?page=0&size=500").andExpect {
            status { isOk() }
            jsonPath("$.ids[?(@ == '${post.id}')]") { isEmpty() }
        }
        // 비로그인·타인 → 404, 작성자 → 200 + hidden 플래그
        mvc.get("/api/posts/${post.id}").andExpect { status { isNotFound() } }
        mvc.get("/api/posts/${post.id}") {
            headers { add("Authorization", "Bearer $otherToken") }
        }.andExpect { status { isNotFound() } }
        mvc.get("/api/posts/${post.id}") {
            headers { add("Authorization", "Bearer $authorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.hidden") { value(true) }
        }
        // 작성자 본인 목록(mine)에는 남는다
        mvc.get("/api/posts/mine") {
            headers { add("Authorization", "Bearer $authorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.id == '${post.id}')].hidden") { value(true) }
        }
    }

    @Test
    fun `숨김 게시글은 좋아요 북마크 댓글 작성이 404다`() {
        val post = savePost()
        setVisibility("POST", post.id, true).andExpect { status { isOk() } }

        mvc.post("/api/posts/${post.id}/like") {
            headers { add("Authorization", "Bearer $otherToken") }
        }.andExpect { status { isNotFound() } }
        mvc.post("/api/posts/${post.id}/bookmark") {
            headers { add("Authorization", "Bearer $otherToken") }
        }.andExpect { status { isNotFound() } }
        mvc.post("/api/posts/${post.id}/comments") {
            headers { add("Authorization", "Bearer $otherToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"댓글"}"""
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `게시글 복구는 공개 노출을 되살리고 작성자에게 두 번 알린다`() {
        val post = savePost()
        val before = notifications.count()
        setVisibility("POST", post.id, true, reason = "정책 위반").andExpect { status { isOk() } }
        setVisibility("POST", post.id, false).andExpect {
            status { isOk() }
            jsonPath("$.hidden") { value(false) }
        }

        mvc.get("/api/posts/${post.id}").andExpect { status { isOk() } }
        assertThat(notifications.count()).isEqualTo(before + 2)
        val types = notifications.findAll().takeLast(2).map { it.type }
        assertThat(types).containsExactlyInAnyOrder(NotificationType.CONTENT_HIDDEN, NotificationType.CONTENT_RESTORED)
        assertThat(notifications.findAll().first { it.type == NotificationType.CONTENT_HIDDEN }.body).contains("정책 위반")
    }

    @Test
    fun `댓글 숨김은 목록에서 제외하고 카운터를 줄이며 복구와 삭제에서 이중 감소하지 않는다`() {
        val post = savePost(comments = 1)
        val comment = saveComment(post.id)

        setVisibility("POST_COMMENT", comment.id, true).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).orElseThrow().comments).isEqualTo(0)
        mvc.get("/api/posts/${post.id}/comments").andExpect {
            status { isOk() }
            jsonPath("$[?(@.id == '${comment.id}')]") { isEmpty() }
        }
        // 숨김 상태 재요청은 멱등(카운터 불변)
        setVisibility("POST_COMMENT", comment.id, true).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).orElseThrow().comments).isEqualTo(0)

        // 복구 → 카운터 원복 + 목록 복귀
        setVisibility("POST_COMMENT", comment.id, false).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).orElseThrow().comments).isEqualTo(1)
        mvc.get("/api/posts/${post.id}/comments").andExpect {
            status { isOk() }
            jsonPath("$[?(@.id == '${comment.id}')].text") { value("숨김 대상 댓글") }
        }

        // 다시 숨긴 뒤 작성자가 삭제해도 카운터가 음수로 이중 감소하지 않는다
        setVisibility("POST_COMMENT", comment.id, true).andExpect { status { isOk() } }
        mvc.delete("/api/posts/${post.id}/comments/${comment.id}") {
            headers { add("Authorization", "Bearer $authorToken") }
        }
        assertThat(posts.findById(post.id).orElseThrow().comments).isEqualTo(0)
    }

    @Test
    fun `행사 숨김은 목록 상세 참여를 차단하고 개설자 상세만 허용한다`() {
        val event = saveEvent()
        setVisibility("EVENT", event.id, true).andExpect { status { isOk() } }

        mvc.get("/api/events").andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '${event.id}')]") { isEmpty() }
        }
        mvc.get("/api/events/${event.id}").andExpect { status { isNotFound() } }
        mvc.get("/api/events/${event.id}") {
            headers { add("Authorization", "Bearer $authorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.hidden") { value(true) }
        }
        mvc.post("/api/events/${event.id}/join") {
            headers { add("Authorization", "Bearer $otherToken") }
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `행사 댓글 숨김은 댓글 목록에서 제외된다`() {
        val event = saveEvent()
        val comment = eventComments.saveAndFlush(
            EventComment(
                id = "vis-cc-${UUID.randomUUID()}",
                eventId = event.id,
                author = Author("작성자", false),
                text = "숨김 대상 행사 댓글",
                createdAt = Instant.parse("2026-07-01T00:00:00Z"),
                authorUserId = 9,
            ),
        )
        setVisibility("EVENT_COMMENT", comment.id, true).andExpect { status { isOk() } }
        mvc.get("/api/events/${event.id}/comments").andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '${comment.id}')]") { isEmpty() }
        }
    }

    @Test
    fun `작성자가 삭제한 콘텐츠는 관리자도 복구할 수 없다`() {
        // soft delete 상태 재현: 삭제 시 deletedAt/hiddenAt 이 함께 마킹된다.
        val post = savePost(authorUserId = 9)
        post.deletedAt = java.time.Instant.now()
        post.hiddenAt = java.time.Instant.now()
        posts.saveAndFlush(post)

        // 복구는 404(삭제된 콘텐츠가 다시 공개되는 것을 막는다), 숨김 요청은 멱등 no-op.
        setVisibility("POST", post.id, false).andExpect { status { isNotFound() } }
        setVisibility("POST", post.id, true).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).get().deletedAt).isNotNull()
    }

    @Test
    fun `예약 대기 글은 숨김 대상이 아니라 409 로 거절되고 예약 상태가 보존된다`() {
        val post = saveScheduledPost()
        setVisibility("POST", post.id, true, reason = "정책 위반").andExpect { status { isConflict() } }
        val stored = posts.findById(post.id).orElseThrow()
        // publishAt·마커 그대로 — 예약이 훼손되거나 관리자 숨김으로 뒤바뀌지 않는다(게시 잡이 예정대로 발행 가능).
        assertThat(stored.publishAt).isNotNull()
        assertThat(stored.hiddenReason).isEqualTo(SCHEDULED_HIDDEN_REASON)
        assertThat(stored.hiddenAt).isNotNull()
    }

    @Test
    fun `예약 대기 글은 숨김 해제 대상이 아니라 409 로 거절돼 조기 공개를 막는다`() {
        val post = saveScheduledPost()
        setVisibility("POST", post.id, false).andExpect { status { isConflict() } }
        val stored = posts.findById(post.id).orElseThrow()
        // 예약 상태 그대로 유지 — 숨김 해제로 조기 공개되지 않는다.
        assertThat(stored.hiddenAt).isNotNull()
        assertThat(stored.hiddenReason).isEqualTo(SCHEDULED_HIDDEN_REASON)
        assertThat(stored.publishAt).isNotNull()
    }

    @Test
    fun `발행 예정 시각이 지났어도 잡이 아직 공개 안 한 예약 글은 여전히 숨김 해제 거부된다`() {
        // publishAt 은 과거지만 ScheduledPublishJob(60초 주기)이 아직 안 돌아 마커가 남은 구간 재현 —
        // isAfter(now) 판별이면 이 창에서 조기 발행 우회가 뚫린다. 마커 잔존으로 포착해 409.
        val post = savePost()
        post.publishAt = Instant.now().minusSeconds(10)
        post.hiddenAt = Instant.now()
        post.hiddenReason = SCHEDULED_HIDDEN_REASON
        posts.saveAndFlush(post)
        setVisibility("POST", post.id, false).andExpect { status { isConflict() } }
        assertThat(posts.findById(post.id).orElseThrow().hiddenAt).isNotNull()
    }

    @Test
    fun `관리자 사유가 우연히 예약 마커 문자열이어도 정상 숨김·복구된다`() {
        // hiddenReason 은 관리자 자유 입력이라 예약 마커와 값이 겹칠 수 있다 — publishAt 으로 판별하므로 영향 없다.
        val post = savePost()
        setVisibility("POST", post.id, true, reason = SCHEDULED_HIDDEN_REASON).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).orElseThrow().hiddenAt).isNotNull()
        // 마커 문자열 사유여도(예약 글이 아니므로) 복구는 정상 동작해야 한다.
        setVisibility("POST", post.id, false).andExpect { status { isOk() } }
        assertThat(posts.findById(post.id).orElseThrow().hiddenAt).isNull()
    }

    @Test
    fun `일괄 복구에 예약 대기 글이 섞여도 나머지는 복구되고 예약 글은 건너뛴다`() {
        val hidden = savePost().also { setVisibility("POST", it.id, true).andExpect { status { isOk() } } }
        val scheduled = saveScheduledPost()
        val body = """
            {"items":[
                {"targetType":"POST","targetId":"${hidden.id}"},
                {"targetType":"POST","targetId":"${scheduled.id}"}
            ],"hidden":false}
        """.trimIndent()
        // 예약 글의 409 가 배치를 중단시키지 않고 missing 으로 보고된다(부분 성공 계약 유지).
        bulk(body).andExpect {
            status { isOk() }
            jsonPath("$.processed") { value(1) }
            jsonPath("$.missing[0].targetId") { value(scheduled.id) }
        }
        assertThat(posts.findById(hidden.id).orElseThrow().hiddenAt).isNull()
        // 예약 글은 그대로(조기 공개되지 않음).
        assertThat(posts.findById(scheduled.id).orElseThrow().hiddenAt).isNotNull()
        assertThat(posts.findById(scheduled.id).orElseThrow().publishAt).isNotNull()
    }

    @Test
    fun `잘못된 대상 타입은 400 없는 대상은 404`() {
        setVisibility("WRONG", "any", true).andExpect { status { isBadRequest() } }
        setVisibility("POST", "missing-post", true).andExpect { status { isNotFound() } }
        setVisibility("POST", "missing-post", false).andExpect { status { isNotFound() } }
    }

    @Test
    fun `신고 조치 완료에 hideContent를 주면 콘텐츠가 함께 숨겨지고 미리보기에 반영된다`() {
        val post = savePost()
        val report = reports.saveAndFlush(
            Report(
                id = "vis-report-${UUID.randomUUID()}",
                reporterUserId = 2,
                targetType = "POST",
                targetId = post.id,
                reason = "SPAM",
                detail = null,
                time = "방금",
                seq = 1,
            ),
        )

        mvc.patch("/api/admin/reports/${report.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(ResolveReportRequest("RESOLVED", "광고 확인", hideContent = true))
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("RESOLVED") }
            jsonPath("$.target.hidden") { value(true) }
        }

        assertThat(posts.findById(post.id).orElseThrow().hiddenAt).isNotNull()
        // 작성자에게 숨김 알림 + 신고자에게 처리 알림이 모두 생성된다
        val types = notifications.findAll().map { it.type }
        assertThat(types).contains(NotificationType.CONTENT_HIDDEN, NotificationType.REPORT_RESOLVED)
    }

    @Test
    fun `예약 대기 글 신고에 hideContent 를 줘도 숨김은 거부되지만 신고는 정상 해결된다`() {
        val post = saveScheduledPost()
        val report = reports.saveAndFlush(
            Report(
                id = "vis-report-${UUID.randomUUID()}",
                reporterUserId = 2,
                targetType = "POST",
                targetId = post.id,
                reason = "SPAM",
                detail = null,
                time = "방금",
                seq = 1,
            ),
        )
        // hide() 의 CONFLICT 가 신고 해결 트랜잭션을 중단시키지 않는다 — 신고는 RESOLVED, 콘텐츠는 예약 상태 그대로.
        mvc.patch("/api/admin/reports/${report.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(ResolveReportRequest("RESOLVED", "확인", hideContent = true))
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("RESOLVED") }
        }
        val stored = posts.findById(post.id).orElseThrow()
        assertThat(stored.publishAt).isNotNull()
        assertThat(stored.hiddenReason).isEqualTo(SCHEDULED_HIDDEN_REASON)
    }

    @Test
    fun `대상이 삭제된 신고도 hideContent 옵션과 무관하게 처리된다`() {
        val report = reports.saveAndFlush(
            Report(
                id = "vis-report-${UUID.randomUUID()}",
                reporterUserId = 2,
                targetType = "POST",
                targetId = "already-deleted-post",
                reason = "SPAM",
                detail = null,
                time = "방금",
                seq = 1,
            ),
        )
        mvc.patch("/api/admin/reports/${report.id}") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = mapper.writeValueAsString(ResolveReportRequest("RESOLVED", null, hideContent = true))
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("RESOLVED") }
            jsonPath("$.target") { value(null) }
        }
    }

    private fun bulk(body: String, bearer: String? = adminToken) =
        mvc.patch("/api/admin/content/bulk") {
            if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    @Test
    fun `일괄 숨김은 대상 전부를 숨기고 없는 항목은 건너뛰어 보고한다`() {
        val a = savePost()
        val b = savePost()
        val body = """
            {"items":[
                {"targetType":"POST","targetId":"${a.id}"},
                {"targetType":"POST","targetId":"${b.id}"},
                {"targetType":"POST","targetId":"vis-post-missing"}
            ],"hidden":true,"reason":"일괄 정리"}
        """.trimIndent()

        bulk(body).andExpect {
            status { isOk() }
            jsonPath("$.requested") { value(3) }
            jsonPath("$.processed") { value(2) }
            jsonPath("$.missing[0].targetId") { value("vis-post-missing") }
        }
        assertThat(posts.findById(a.id).orElseThrow().hiddenAt).isNotNull()
        assertThat(posts.findById(b.id).orElseThrow().hiddenAt).isNotNull()
        assertThat(posts.findById(a.id).orElseThrow().hiddenReason).isEqualTo("일괄 정리")

        // 일괄 복구
        val restore = """
            {"items":[
                {"targetType":"POST","targetId":"${a.id}"},
                {"targetType":"POST","targetId":"${b.id}"}
            ],"hidden":false}
        """.trimIndent()
        bulk(restore).andExpect {
            status { isOk() }
            jsonPath("$.processed") { value(2) }
        }
        assertThat(posts.findById(a.id).orElseThrow().hiddenAt).isNull()
    }

    @Test
    fun `일괄 요청은 빈 목록과 50건 초과를 거절한다`() {
        bulk("""{"items":[],"hidden":true}""").andExpect { status { isBadRequest() } }
        val tooMany = (1..51).joinToString(",") { """{"targetType":"POST","targetId":"x$it"}""" }
        bulk("""{"items":[$tooMany],"hidden":true}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `일괄 처리는 일반 회원 403, 비로그인 401`() {
        val a = savePost()
        val body = """{"items":[{"targetType":"POST","targetId":"${a.id}"}],"hidden":true}"""
        bulk(body, bearer = otherToken).andExpect { status { isForbidden() } }
        bulk(body, bearer = null).andExpect { status { isUnauthorized() } }
    }
}
