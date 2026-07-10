package com.hanbit.api.event

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.notification.NotificationRepository
import com.hanbit.api.post.Author
import com.hanbit.api.security.JwtService
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EventCommentControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val mapper: JsonMapper,
    @param:Autowired private val eventRepo: EventRepository,
    @param:Autowired private val commentRepo: EventCommentRepository,
    @param:Autowired private val notificationRepo: NotificationRepository,
    @param:Autowired private val userRepo: UserRepository,
) {
    private val ownerToken = jwt.issue(
        User(id = 1, email = "comment@test.com", passwordHash = "x", name = "댓글 작성자", verified = true),
    )
    private val otherToken = jwt.issue(
        User(id = 2, email = "other-comment@test.com", passwordHash = "x", name = "다른 사용자", verified = false),
    )

    private fun saveEvent(
        status: String = "upcoming",
        authorUserId: Long? = 1,
    ): String {
        val id = "comment-c-${UUID.randomUUID()}"
        eventRepo.saveAndFlush(
            Event(
                id = id,
                status = status,
                title = "댓글 행사",
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
                authorUserId = authorUserId,
            ),
        )
        return id
    }

    private fun saveComment(
        eventId: String,
        authorUserId: Long? = 1,
        id: String = "cc-${UUID.randomUUID()}",
        text: String = "댓글 본문",
        createdAt: Instant = Instant.now(),
        authorName: String = "댓글 작성자",
        verified: Boolean = authorUserId == 1L,
        updatedAt: Instant? = null,
    ): String {
        commentRepo.saveAndFlush(
            EventComment(
                id = id,
                eventId = eventId,
                author = Author(authorName, verified),
                text = text,
                createdAt = createdAt,
                authorUserId = authorUserId,
                updatedAt = updatedAt,
            ),
        )
        return id
    }

    private fun listComments(
        eventId: String,
        page: Int = 0,
        size: Int = 20,
        bearer: String? = null,
    ) = mvc.get("/api/events/$eventId/comments") {
        param("page", page.toString())
        param("size", size.toString())
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
    }

    private fun createComment(
        eventId: String,
        text: String,
        bearer: String? = ownerToken,
    ) = mvc.post("/api/events/$eventId/comments") {
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        contentType = MediaType.APPLICATION_JSON
        content = mapper.writeValueAsString(CreateEventCommentRequest(text))
    }

    private fun deleteComment(
        eventId: String,
        commentId: String,
        bearer: String? = ownerToken,
    ) = mvc.delete("/api/events/$eventId/comments/$commentId") {
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
    }

    private fun updateComment(
        eventId: String,
        commentId: String,
        text: String,
        bearer: String? = ownerToken,
    ) = mvc.put("/api/events/$eventId/comments/$commentId") {
        if (bearer != null) headers { add("Authorization", "Bearer $bearer") }
        contentType = MediaType.APPLICATION_JSON
        content = mapper.writeValueAsString(UpdateEventCommentRequest(text))
    }

    private fun commentLocation(eventId: String, commentId: String, size: Int = 20) =
        mvc.get("/api/events/$eventId/comments/$commentId/page") {
            param("size", size.toString())
        }

    @Test
    fun `없는 행사 댓글 목록은 404`() {
        listComments("missing").andExpect { status { isNotFound() } }
    }

    @Test
    fun `없는 행사 댓글 작성과 삭제는 404`() {
        createComment("missing", "댓글").andExpect { status { isNotFound() } }
        deleteComment("missing", "cc-missing").andExpect { status { isNotFound() } }
    }

    @Test
    fun `빈 댓글 목록은 pagination metadata와 함께 반환한다`() {
        val eventId = saveEvent()

        listComments(eventId).andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(0) }
            jsonPath("$.page") { value(0) }
            jsonPath("$.size") { value(20) }
            jsonPath("$.totalElements") { value(0) }
            jsonPath("$.totalPages") { value(0) }
        }
    }

    @Test
    fun `공개 목록은 false이고 로그인 작성자는 자신의 댓글만 ownedByMe true`() {
        val eventId = saveEvent()
        val mine = saveComment(eventId, authorUserId = 1)
        val other = saveComment(eventId, authorUserId = 2)
        val legacy = saveComment(eventId, authorUserId = null)

        listComments(eventId).andExpect {
            status { isOk() }
            jsonPath("$.content[*].ownedByMe") { value(Matchers.everyItem(Matchers.equalTo(false))) }
            jsonPath("$.content[*].edited") { value(Matchers.everyItem(Matchers.equalTo(false))) }
            jsonPath("$.content[*].updatedAt") { value(Matchers.everyItem(Matchers.nullValue())) }
        }
        listComments(eventId, bearer = ownerToken).andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '$mine')].ownedByMe") { value(Matchers.hasItem(true)) }
            jsonPath("$.content[?(@.id == '$other')].ownedByMe") { value(Matchers.hasItem(false)) }
            jsonPath("$.content[?(@.id == '$legacy')].ownedByMe") { value(Matchers.hasItem(false)) }
        }
    }

    @Test
    fun `댓글은 최신순이고 동일 시각에는 id 오름차순`() {
        val eventId = saveEvent()
        val tiedAt = Instant.parse("2026-06-28T01:00:00Z")
        saveComment(eventId, id = "cc-b", createdAt = tiedAt)
        saveComment(eventId, id = "cc-a", createdAt = tiedAt)
        saveComment(eventId, id = "cc-new", createdAt = tiedAt.plusSeconds(1))

        listComments(eventId).andExpect {
            status { isOk() }
            jsonPath("$.content[*].id") { value(Matchers.contains("cc-new", "cc-a", "cc-b")) }
        }
    }

    @Test
    fun `page와 size를 적용하고 범위를 검증한다`() {
        val eventId = saveEvent()
        repeat(3) { index ->
            saveComment(eventId, createdAt = Instant.parse("2026-06-28T01:00:0${index}Z"))
        }

        listComments(eventId, page = 1, size = 2).andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(1) }
            jsonPath("$.page") { value(1) }
            jsonPath("$.size") { value(2) }
            jsonPath("$.totalElements") { value(3) }
            jsonPath("$.totalPages") { value(2) }
        }
        listComments(eventId, page = -1).andExpect { status { isBadRequest() } }
        listComments(eventId, size = 0).andExpect { status { isBadRequest() } }
        listComments(eventId, size = 101).andExpect { status { isBadRequest() } }
        listComments(eventId, size = 1).andExpect { status { isOk() } }
        listComments(eventId, size = 100).andExpect { status { isOk() } }
    }

    @Test
    fun `댓글 location API는 목록과 같은 최신순 및 tie breaker를 사용한다`() {
        val eventId = saveEvent()
        val tiedAt = Instant.parse("2026-06-28T01:00:00Z")
        val newest = saveComment(eventId, id = "location-new", createdAt = tiedAt.plusSeconds(1))
        val tieA = saveComment(eventId, id = "location-a", createdAt = tiedAt)
        val tieB = saveComment(eventId, id = "location-b", createdAt = tiedAt)
        val oldest = saveComment(eventId, id = "location-old", createdAt = tiedAt.minusSeconds(1))

        fun expectPage(commentId: String, size: Int, page: Int) {
            commentLocation(eventId, commentId, size).andExpect {
                status { isOk() }
                jsonPath("$.commentId") { value(commentId) }
                jsonPath("$.page") { value(page) }
                jsonPath("$.size") { value(size) }
            }
        }

        expectPage(newest, size = 2, page = 0)
        expectPage(tieA, size = 2, page = 0)
        expectPage(tieB, size = 2, page = 1)
        expectPage(oldest, size = 2, page = 1)
        expectPage(tieB, size = 1, page = 2)
    }

    @Test
    fun `댓글 location API는 행사 관계와 size 및 삭제 상태를 검증한다`() {
        val eventId = saveEvent()
        val otherEventId = saveEvent()
        val commentId = saveComment(eventId)
        val otherCommentId = saveComment(otherEventId)

        commentLocation("missing", commentId).andExpect { status { isNotFound() } }
        commentLocation(eventId, "missing").andExpect { status { isNotFound() } }
        commentLocation(eventId, otherCommentId).andExpect { status { isNotFound() } }
        commentLocation(eventId, commentId, size = 0).andExpect { status { isBadRequest() } }
        commentLocation(eventId, commentId, size = 101).andExpect { status { isBadRequest() } }

        commentRepo.deleteById(commentId)
        commentRepo.flush()
        commentLocation(eventId, commentId).andExpect { status { isNotFound() } }
    }

    @Test
    fun `비로그인 댓글 작성은 401`() {
        val eventId = saveEvent()
        createComment(eventId, "작성 불가", bearer = null).andExpect { status { isUnauthorized() } }
        assertThat(commentRepo.countByEventId(eventId)).isZero()
    }

    @Test
    fun `blank와 500자 초과 댓글 작성은 400`() {
        val eventId = saveEvent()
        createComment(eventId, "   ").andExpect { status { isBadRequest() } }
        createComment(eventId, "가".repeat(501)).andExpect { status { isBadRequest() } }
        assertThat(commentRepo.countByEventId(eventId)).isZero()
    }

    @Test
    fun `정상 작성은 trim과 author snapshot을 저장하고 소유 상태를 반환한다`() {
        val eventId = saveEvent(status = "closed")
        val before = Instant.now()

        val result = createComment(eventId, "  상태와 무관한 댓글  ").andExpect {
            status { isCreated() }
            jsonPath("$.id") { value(Matchers.startsWith("cc-")) }
            jsonPath("$.eventId") { value(eventId) }
            jsonPath("$.author.name") { value("테스트 사용자 1") }
            jsonPath("$.author.verified") { value(false) }
            jsonPath("$.text") { value("상태와 무관한 댓글") }
            jsonPath("$.createdAt") { exists() }
            jsonPath("$.ownedByMe") { value(true) }
            jsonPath("$.edited") { value(false) }
            jsonPath("$.updatedAt") { value(null) }
            jsonPath("$.authorUserId") { doesNotExist() }
        }.andReturn()

        val id = mapper.readTree(result.response.contentAsString)["id"].asString()
        val saved = commentRepo.findById(id).orElseThrow()
        assertThat(saved.authorUserId).isEqualTo(1)
        assertThat(saved.author.name).isEqualTo("테스트 사용자 1")
        assertThat(saved.author.verified).isFalse()
        assertThat(saved.text).isEqualTo("상태와 무관한 댓글")
        assertThat(saved.createdAt).isAfterOrEqualTo(before)
    }

    @Test
    fun `댓글 작성 시 현재 사용자 프로필이 author snapshot에 반영된다`() {
        val user = userRepo.findById(1L).orElseThrow()
        user.name = "행사댓글러"
        user.profileImageUrl = "https://example.com/event-avatar.png"
        userRepo.saveAndFlush(user)

        val eventId = saveEvent()
        createComment(eventId, "프로필 스냅샷").andExpect {
            status { isCreated() }
            jsonPath("$.author.name") { value("행사댓글러") }
            jsonPath("$.author.verified") { value(false) }
            jsonPath("$.author.profileImageUrl") { value("https://example.com/event-avatar.png") }
        }

        val saved = commentRepo.findByEventId(eventId, org.springframework.data.domain.PageRequest.of(0, 1)).content.single()
        assertThat(saved.author.name).isEqualTo("행사댓글러")
        assertThat(saved.author.profileImageUrl).isEqualTo("https://example.com/event-avatar.png")
    }

    @Test
    fun `댓글 작성자는 text만 수정하고 edited 정보를 받는다`() {
        val eventId = saveEvent()
        val createdAt = Instant.parse("2026-06-28T01:00:00Z")
        val commentId = saveComment(eventId, text = "원래 댓글", createdAt = createdAt)
        val notificationCount = notificationRepo.count()

        updateComment(eventId, commentId, "  수정된 댓글  ").andExpect {
            status { isOk() }
            jsonPath("$.id") { value(commentId) }
            jsonPath("$.eventId") { value(eventId) }
            jsonPath("$.text") { value("수정된 댓글") }
            jsonPath("$.createdAt") { value(createdAt.toString()) }
            jsonPath("$.ownedByMe") { value(true) }
            jsonPath("$.edited") { value(true) }
            jsonPath("$.updatedAt") { exists() }
            jsonPath("$.authorUserId") { doesNotExist() }
        }
        updateComment(eventId, commentId, "수정된 댓글").andExpect { status { isOk() } }

        val saved = commentRepo.findById(commentId).orElseThrow()
        assertThat(saved.text).isEqualTo("수정된 댓글")
        assertThat(saved.updatedAt).isNotNull()
        assertThat(saved.createdAt).isEqualTo(createdAt)
        assertThat(saved.author.name).isEqualTo("댓글 작성자")
        assertThat(saved.authorUserId).isEqualTo(1)
        assertThat(commentRepo.countByEventId(eventId)).isEqualTo(1)
        assertThat(notificationRepo.count()).isEqualTo(notificationCount)
        listComments(eventId, bearer = ownerToken).andExpect {
            status { isOk() }
            jsonPath("$.content[0].text") { value("수정된 댓글") }
            jsonPath("$.content[0].edited") { value(true) }
            jsonPath("$.content[0].updatedAt") { exists() }
        }
        commentLocation(eventId, commentId).andExpect {
            status { isOk() }
            jsonPath("$.page") { value(0) }
        }
    }

    @Test
    fun `댓글 수정은 blank와 500자 초과를 거부하고 기존 내용을 유지한다`() {
        val eventId = saveEvent()
        val commentId = saveComment(eventId, text = "원래 댓글")

        updateComment(eventId, commentId, "   ").andExpect { status { isBadRequest() } }
        updateComment(eventId, commentId, "가".repeat(501)).andExpect { status { isBadRequest() } }

        val saved = commentRepo.findById(commentId).orElseThrow()
        assertThat(saved.text).isEqualTo("원래 댓글")
        assertThat(saved.updatedAt).isNull()
    }

    @Test
    fun `댓글 수정은 인증과 작성자 소유권을 검증한다`() {
        val eventId = saveEvent()
        val mine = saveComment(eventId, authorUserId = 1)
        val legacy = saveComment(eventId, authorUserId = null)

        updateComment(eventId, mine, "수정", bearer = null).andExpect { status { isUnauthorized() } }
        updateComment(eventId, mine, "수정", bearer = otherToken).andExpect { status { isForbidden() } }
        updateComment(eventId, legacy, "수정").andExpect { status { isForbidden() } }
        assertThat(commentRepo.findById(mine).orElseThrow().updatedAt).isNull()
        assertThat(commentRepo.findById(legacy).orElseThrow().updatedAt).isNull()
    }

    @Test
    fun `댓글 수정은 행사과 댓글 관계를 검증한다`() {
        val eventId = saveEvent()
        val otherEventId = saveEvent()
        val otherCommentId = saveComment(otherEventId)

        updateComment("missing", otherCommentId, "수정").andExpect { status { isNotFound() } }
        updateComment(eventId, "missing", "수정").andExpect { status { isNotFound() } }
        updateComment(eventId, otherCommentId, "수정").andExpect { status { isNotFound() } }
        assertThat(commentRepo.findById(otherCommentId).orElseThrow().updatedAt).isNull()
    }

    @Test
    fun `작성자는 자신의 댓글을 삭제하면 204이고 soft delete 마킹된다`() {
        val eventId = saveEvent()
        val commentId = saveComment(eventId)

        deleteComment(eventId, commentId).andExpect { status { isNoContent() } }
        // soft delete: row 는 남고 deletedAt/hiddenAt 마킹으로 목록에서 제외된다.
        val deleted = commentRepo.findById(commentId).orElseThrow()
        assertThat(deleted.deletedAt).isNotNull()
        assertThat(deleted.hiddenAt).isNotNull()
        deleteComment(eventId, commentId).andExpect { status { isNotFound() } }
    }

    @Test
    fun `비로그인 댓글 삭제는 401`() {
        val eventId = saveEvent()
        val commentId = saveComment(eventId)

        deleteComment(eventId, commentId, bearer = null).andExpect { status { isUnauthorized() } }
        assertThat(commentRepo.existsById(commentId)).isTrue()
    }

    @Test
    fun `다른 사용자의 댓글 삭제는 403이고 데이터를 유지한다`() {
        val eventId = saveEvent()
        val commentId = saveComment(eventId)

        deleteComment(eventId, commentId, bearer = otherToken).andExpect { status { isForbidden() } }
        assertThat(commentRepo.existsById(commentId)).isTrue()
    }

    @Test
    fun `다른 행사의 commentId와 없는 댓글은 404`() {
        val eventId = saveEvent()
        val otherEventId = saveEvent()
        val commentId = saveComment(otherEventId)

        deleteComment(eventId, commentId).andExpect { status { isNotFound() } }
        deleteComment(eventId, "cc-missing").andExpect { status { isNotFound() } }
        assertThat(commentRepo.existsById(commentId)).isTrue()
    }

    @Test
    fun `삭제한 댓글의 반복 삭제와 수정은 404`() {
        val eventId = saveEvent()
        val commentId = saveComment(eventId)

        deleteComment(eventId, commentId).andExpect { status { isNoContent() } }
        deleteComment(eventId, commentId).andExpect { status { isNotFound() } }
        updateComment(eventId, commentId, "수정 시도").andExpect { status { isNotFound() } }
    }

    @Test
    fun `행사 삭제 후에도 댓글 row는 보존되고 목록 조회는 404`() {
        val eventId = saveEvent(status = "upcoming", authorUserId = 1)
        val otherEventId = saveEvent(status = "upcoming", authorUserId = 1)
        saveComment(eventId)
        val otherComment = saveComment(otherEventId)

        mvc.delete("/api/events/$eventId") {
            headers { add("Authorization", "Bearer $ownerToken") }
        }.andExpect { status { isNoContent() } }

        // soft delete: 댓글 row 는 남지만 행사이 404 라 노출 경로가 없다.
        assertThat(commentRepo.countByEventId(eventId)).isEqualTo(1)
        mvc.get("/api/events/$eventId/comments").andExpect { status { isNotFound() } }
        assertThat(commentRepo.existsById(otherComment)).isTrue()
    }
}
