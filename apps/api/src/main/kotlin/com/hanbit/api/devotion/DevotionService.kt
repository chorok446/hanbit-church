package com.hanbit.api.devotion

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.auth.findActiveOrThrow
import com.hanbit.api.common.ListingLimits.MAX_SITEMAP_PAGE_SIZE
import com.hanbit.api.common.SitemapIdsResponse
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.common.totalPages
import com.hanbit.api.security.AuthUser
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

/**
 * 데일리 큐티(오늘의 말씀·묵상) 서비스.
 *
 * 공개 노출 게이트는 devotionDate <= 오늘(KST) 하나로 통일한다 — 미래 날짜 등록분은
 * 그날이 되어야 today/목록/상세에 나타난다(예약 게시 개념 재사용). clock 은 KST 고정(EventClockConfig).
 * 관리자 쓰기 권한은 SecurityConfig 의 admin devotions 경로 매처가 강제하므로 여기선 재검사하지 않는다.
 */
@Service
class DevotionService(
    private val repo: DevotionRepository,
    private val commentRepo: DevotionCommentRepository,
    private val users: UserRepository,
    private val clock: Clock,
) {
    private fun today(): LocalDate = LocalDate.now(clock)

    // ─── 공개 조회 ───

    @Transactional(readOnly = true)
    fun getToday(): DevotionResponse? =
        repo.findFirstByDevotionDateLessThanEqualOrderByDevotionDateDesc(today())?.toResponse()

    @Transactional(readOnly = true)
    fun listSitemapIds(page: Int, size: Int): SitemapIdsResponse {
        checkPageParams(page, size, MAX_SITEMAP_PAGE_SIZE)
        val result = repo.findPublishedIds(today(), PageRequest.of(page, size))
        return SitemapIdsResponse(
            ids = result.content,
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    @Transactional(readOnly = true)
    fun getPublic(id: String): DevotionResponse {
        val d = repo.findById(id).orElseThrow { notFound() }
        // 미래 예약분은 공개 상세에서 감춘다(존재를 드러내지 않는 404).
        if (d.devotionDate.isAfter(today())) throw notFound()
        return d.toResponse()
    }

    @Transactional(readOnly = true)
    fun listPublic(page: Int, size: Int): DevotionPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val result = repo.findByDevotionDateLessThanEqualOrderByDevotionDateDesc(today(), PageRequest.of(page, size))
        return result.toPageResponse()
    }

    // ─── 관리자 ───

    @Transactional(readOnly = true)
    fun listAdmin(page: Int, size: Int): DevotionPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        return repo.findAllByOrderByDevotionDateDesc(PageRequest.of(page, size)).toPageResponse()
    }

    @Transactional(readOnly = true)
    fun getAdmin(id: String): DevotionResponse =
        repo.findById(id).orElseThrow { notFound() }.toResponse()

    @Transactional
    fun create(requesterId: Long, req: SaveDevotionRequest): DevotionResponse {
        val date = parseDate(req.date)
        if (repo.findByDevotionDate(date) != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "$date 에 이미 등록된 묵상이 있습니다")
        }
        val fields = req.validated()
        val author = req.authorName?.trim()?.ifBlank { null } ?: users.findActiveOrThrow(requesterId).name
        val now = Instant.now(clock)
        val saved = repo.save(
            Devotion(
                id = "dv-${UUID.randomUUID()}",
                devotionDate = date,
                verseRef = fields.verseRef,
                verseText = fields.verseText,
                meditation = fields.meditation,
                authorName = author,
                authorUserId = requesterId,
                createdAt = now,
                updatedAt = now,
            ),
        )
        return saved.toResponse()
    }

    @Transactional
    fun update(id: String, req: SaveDevotionRequest): DevotionResponse {
        val d = repo.findById(id).orElseThrow { notFound() }
        val date = parseDate(req.date)
        if (date != d.devotionDate && repo.findByDevotionDate(date) != null) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "$date 에 이미 등록된 묵상이 있습니다")
        }
        val fields = req.validated()
        d.devotionDate = date
        d.verseRef = fields.verseRef
        d.verseText = fields.verseText
        d.meditation = fields.meditation
        req.authorName?.trim()?.ifBlank { null }?.let { d.authorName = it }
        d.updatedAt = Instant.now(clock)
        return d.toResponse()
    }

    @Transactional
    fun delete(id: String) {
        val d = repo.findById(id).orElseThrow { notFound() }
        commentRepo.deleteByDevotionId(d.id)
        repo.delete(d)
    }

    // ─── 은혜나눔 댓글 ───

    @Transactional(readOnly = true)
    fun listComments(id: String, currentUserId: Long?): List<DevotionCommentResponse> {
        requirePublic(id)
        val staff = isContentStaff(currentUserId)
        return commentRepo.findByDevotionIdOrderByCreatedAtAscIdAsc(id)
            .map { it.toResponse(currentUserId, staff) }
    }

    @Transactional
    fun addComment(id: String, author: AuthUser, req: CreateDevotionCommentRequest): DevotionCommentResponse {
        requirePublic(id)
        val text = normalizeText(req.text, "댓글", MAX_COMMENT_LEN)
        val name = users.findActiveOrThrow(author.id).name
        val saved = commentRepo.save(
            DevotionComment(
                id = "dvc-${UUID.randomUUID()}",
                devotionId = id,
                authorName = name,
                authorUserId = author.id,
                text = text,
                createdAt = Instant.now(clock),
            ),
        )
        // 동시 작성에도 카운터가 유실되지 않게 DB 원자 증가(lost update 방지).
        repo.incrementComments(id)
        return saved.toResponse(author.id, staff = false)
    }

    @Transactional
    fun deleteComment(id: String, commentId: String, requester: AuthUser) {
        val comment = commentRepo.findById(commentId).orElseThrow { notFoundComment() }
        if (comment.devotionId != id) throw notFoundComment()
        if (comment.authorUserId != requester.id && !isContentStaff(requester.id)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the comment author")
        }
        commentRepo.delete(comment)
        repo.decrementComments(id)
    }

    // ─── 내부 헬퍼 ───

    /** 공개 대상(존재 + 미래 예약분 아님) 확인. 아니면 404. */
    private fun requirePublic(id: String) {
        val d = repo.findById(id).orElseThrow { notFound() }
        if (d.devotionDate.isAfter(today())) throw notFound()
    }

    /** 콘텐츠 스태프(공지·주보 관리 권한과 동일: ADMIN/OPERATOR/CONTENT). 댓글 모더레이션 허용 기준. */
    private fun isContentStaff(userId: Long?): Boolean {
        if (userId == null) return false
        val role = users.findById(userId).orElse(null)?.role ?: return false
        return role in CONTENT_STAFF_ROLES
    }

    private fun parseDate(raw: String): LocalDate =
        try {
            LocalDate.parse(raw.trim())
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜 형식이 올바르지 않습니다(YYYY-MM-DD)")
        }

    private fun SaveDevotionRequest.validated(): ValidatedFields {
        val verseRef = normalizeText(verseRef, "성경 구절", 120)
        val verseText = normalizeText(verseText, "본문", MAX_VERSE_LEN)
        val meditation = normalizeText(meditation, "묵상글", MAX_MEDITATION_LEN)
        return ValidatedFields(verseRef, verseText, meditation)
    }

    private fun normalizeText(raw: String, label: String, max: Int): String {
        val text = raw.trim()
        if (text.isEmpty()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "${label}을(를) 입력해 주세요")
        if (text.length > max) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "${label}이(가) 너무 깁니다")
        return text
    }

    private fun Devotion.toResponse() = DevotionResponse(
        id = id,
        date = devotionDate,
        verseRef = verseRef,
        verseText = verseText,
        meditation = meditation,
        authorName = authorName,
        comments = comments,
        scheduled = devotionDate.isAfter(today()),
        createdAt = createdAt,
        updatedAt = updatedAt,
    )

    private fun org.springframework.data.domain.Page<Devotion>.toPageResponse() = DevotionPageResponse(
        content = content.map { it.toSummary() },
        page = number,
        size = size,
        totalElements = totalElements,
        totalPages = totalPages,
    )

    private fun Devotion.toSummary() = DevotionSummary(
        id = id,
        date = devotionDate,
        verseRef = verseRef,
        verseText = verseText,
        excerpt = meditation.take(120),
        comments = comments,
        scheduled = devotionDate.isAfter(today()),
    )

    private fun DevotionComment.toResponse(currentUserId: Long?, staff: Boolean) = DevotionCommentResponse(
        id = id,
        authorName = authorName,
        text = text,
        createdAt = createdAt,
        canDelete = (authorUserId != null && authorUserId == currentUserId) || staff,
    )

    private data class ValidatedFields(val verseRef: String, val verseText: String, val meditation: String)

    private fun notFound() = ResponseStatusException(HttpStatus.NOT_FOUND, "devotion not found")
    private fun notFoundComment() = ResponseStatusException(HttpStatus.NOT_FOUND, "comment not found")

    private companion object {
        const val MAX_PAGE_SIZE = 50
        const val MAX_VERSE_LEN = 500
        const val MAX_MEDITATION_LEN = 5000
        const val MAX_COMMENT_LEN = 2000
        val CONTENT_STAFF_ROLES = setOf(UserRole.ADMIN.name, UserRole.OPERATOR.name, UserRole.CONTENT.name)
    }
}
