package com.hanbit.api.post

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.common.badRequest
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.common.ListingLimits.MAX_SEARCH_PAGE_SIZE
import com.hanbit.api.common.ListingLimits.MAX_SEARCH_QUERY_LENGTH
import com.hanbit.api.common.ListingLimits.MAX_SITEMAP_PAGE_SIZE
import com.hanbit.api.common.SitemapIdsResponse
import com.hanbit.api.common.presenceByPage
import com.hanbit.api.common.totalPages
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.security.AuthUser
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * 게시글 도메인 서비스. 게시글 조회/검색/작성/수정/삭제와 좋아요·북마크 정책을 담당한다.
 * Controller 에서 옮겨온 validation, 소유권 판정, N+1 회피용 bulk 조회, 동시성 lock, 트랜잭션을 이 계층에 둔다.
 */
@Service
class PostService(
    private val repo: PostRepository,
    private val events: EventRepository,
    private val users: UserRepository,
    private val likeRepo: PostLikeRepository,
    private val prayerRepo: PostPrayerRepository,
    private val bookmarkRepo: PostBookmarkRepository,
    private val commentRepo: PostCommentRepository,
    private val postSearch: PostSearchRepository,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun listPosts(currentUserId: Long?, page: Int, size: Int): PostPageResponse {
        // 무제한 직렬화 방지 — page/size 페이지네이션. 기본 size 는 MAX_SEARCH_PAGE_SIZE(=하드캡).
        // 전체 브라우징·필터는 /search 를 쓴다. 교인만 공개(MEMBERS) 가시성은 로그인 사용자에게만
        // (승인제라 로그인 = 승인 교인) — 비로그인은 WHERE 로 걸러 슬라이스와 total 이 정확하다.
        checkPageParams(page, size, MAX_SEARCH_PAGE_SIZE)
        // 동일 seq(동시 생성) 레코드가 페이지 경계에서 누락/중복되지 않도록 id 오름차순 tie breaker 추가.
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "seq").and(Sort.by("id")))
        val result = if (currentUserId != null) {
            repo.findByHiddenAtIsNull(pageable)
        } else {
            repo.findByHiddenAtIsNullAndVisibility(PostVisibility.PUBLIC, pageable)
        }
        val posts = result.content
        // N+1 회피: 내가 좋아요/북마크한 postId 를 각각 한 번에 조회.
        val likedIds = likedByPage(currentUserId, posts.map { it.id })
        val bookmarkedIds = bookmarkedByPage(currentUserId, posts.map { it.id })
        val prayedIds = prayedByPage(currentUserId, posts.map { it.id })
        return PostPageResponse(
            content = posts.map {
                it.toResponse(
                    viewerId = currentUserId,
                    likedByMe = it.id in likedIds,
                    bookmarkedByMe = it.id in bookmarkedIds,
                    prayedByMe = it.id in prayedIds,
                )
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /** sitemap 전용 id 목록. JSON 본문 없이 id 만 페이지 단위로 반환한다. */
    @Transactional(readOnly = true)
    fun listSitemapIds(page: Int, size: Int): SitemapIdsResponse {
        checkPageParams(page, size, MAX_SITEMAP_PAGE_SIZE)
        val result = repo.findIds(PageRequest.of(page, size))
        return SitemapIdsResponse(
            ids = result.content,
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /** 공개 검색. Querydsl content/count와 현재 page 상호작용 bulk 조회를 분리한다. */
    @Transactional(readOnly = true)
    fun searchPosts(
        currentUserId: Long?,
        q: String?,
        tag: String?,
        eventOnly: Boolean,
        sort: String,
        page: Int,
        size: Int,
        category: String? = null,
    ): PostSearchResponse {
        checkPageParams(page, size, MAX_SEARCH_PAGE_SIZE)

        val query = q?.trim()?.takeIf { it.isNotEmpty() }
        if (query != null && query.length > MAX_SEARCH_QUERY_LENGTH) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "q must not exceed $MAX_SEARCH_QUERY_LENGTH characters",
            )
        }
        // 콤마 구분 다중 카테고리 허용 — 교제 피드가 나눔·기도만(SHARING,PRAYER) 조회하는 데 쓴다.
        val categoryFilter = category?.split(",")
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?.takeIf { it.isNotEmpty() }
            ?.also { values ->
                if (values.any { it !in PostCategory.ALL }) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid post category")
                }
            }
        val tagFilter = tag?.trim()?.takeIf { it.isNotEmpty() }
        if (tagFilter != null && tagFilter.length > MAX_SEARCH_QUERY_LENGTH) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "tag must not exceed $MAX_SEARCH_QUERY_LENGTH characters",
            )
        }
        val searchSort = when (sort) {
            "latest" -> PostSearchSort.LATEST
            "popular" -> PostSearchSort.POPULAR
            "discussed" -> PostSearchSort.DISCUSSED
            "relevance" -> PostSearchSort.RELEVANCE
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid post sort")
        }

        val result = postSearch.search(
            PostSearchCondition(
                query = query,
                tag = tagFilter,
                categories = categoryFilter,
                eventOnly = eventOnly,
                authorUserIds = null,
                sort = searchSort,
                page = page,
                size = size,
                // 교인만 공개(MEMBERS)는 로그인 사용자에게만 검색된다.
                includeMembersOnly = currentUserId != null,
            ),
        )
        val postIds = result.content.map { it.id }
        val likedIds = likedByPage(currentUserId, postIds)
        val bookmarkedIds = bookmarkedByPage(currentUserId, postIds)
        val prayedIds = prayedByPage(currentUserId, postIds)

        return PostSearchResponse(
            content = result.content.map {
                it.toResponse(
                    viewerId = currentUserId,
                    likedByMe = it.id in likedIds,
                    bookmarkedByMe = it.id in bookmarkedIds,
                    prayedByMe = it.id in prayedIds,
                )
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /** 특정 사용자의 공개 게시글 목록. */
    @Transactional(readOnly = true)
    fun getPostsByAuthorPage(authorUserId: Long, viewerId: Long?, page: Int, size: Int): PostPageResponse {
        val author = users.findById(authorUserId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (author.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        validatePageParams(page, size)
        // 익명 기도제목은 공개 프로필에서 제외 — 프로필 경유로 작성자가 드러나면 안 된다.
        // 교인만 공개(MEMBERS)는 비로그인 프로필 조회에서 제외.
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "seq").and(Sort.by("id")))
        val result = if (viewerId != null) {
            repo.findByAuthorUserIdAndAnonymousFalseAndHiddenAtIsNull(authorUserId, pageable)
        } else {
            repo.findByAuthorUserIdAndAnonymousFalseAndVisibilityAndHiddenAtIsNull(authorUserId, PostVisibility.PUBLIC, pageable)
        }
        val postIds = result.content.map { it.id }
        val likedIds = likedByPage(viewerId, postIds)
        val bookmarkedIds = bookmarkedByPage(viewerId, postIds)
        return PostPageResponse(
            content = result.content.map {
                it.toResponse(viewerId = viewerId, likedByMe = it.id in likedIds, bookmarkedByMe = it.id in bookmarkedIds)
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /**
     * 현재 사용자가 저장한 게시글(레거시 비페이지 배열). 무제한 반환을 막기 위해 페이지 버전의 첫 페이지
     * (최대 MAX_SEARCH_PAGE_SIZE)로 상한을 둔다 — 전체가 필요하면 /bookmarks/page 를 쓴다.
     */
    @Transactional(readOnly = true)
    fun getMyBookmarks(userId: Long): List<PostResponse> =
        getMyBookmarksPage(userId, 0, MAX_SEARCH_PAGE_SIZE).content

    /**
     * 현재 사용자가 작성한 게시글(레거시 비페이지 배열). 무제한 반환을 막기 위해 페이지 버전의 첫 페이지
     * (최대 MAX_SEARCH_PAGE_SIZE)로 상한을 둔다 — 전체가 필요하면 /mine/page 를 쓴다.
     */
    @Transactional(readOnly = true)
    fun getMyPosts(userId: Long): List<PostResponse> =
        getMyPostsPage(userId, 0, MAX_SEARCH_PAGE_SIZE).content

    /** 내 게시글 pagination. 최신순(seq DESC, id). 현재 page 의 id 만 대상으로 좋아요/북마크 bulk 조회. */
    @Transactional(readOnly = true)
    fun getMyPostsPage(userId: Long, page: Int, size: Int): PostPageResponse {
        validatePageParams(page, size)
        val result = repo.findByAuthorUserIdAndDeletedAtIsNull(
            userId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "seq").and(Sort.by("id"))),
        )
        val postIds = result.content.map { it.id }
        val likedIds = likedByPage(userId, postIds)
        val bookmarkedIds = bookmarkedByPage(userId, postIds)
        return PostPageResponse(
            content = result.content.map {
                it.toResponse(viewerId = userId, likedByMe = it.id in likedIds, bookmarkedByMe = it.id in bookmarkedIds)
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /**
     * 저장한 게시글 pagination. 공개(숨김·삭제 아님) 게시글만 JOIN 쿼리로 page·count 해 total 과 슬라이스를
     * 함께 필터한다(orphan·숨김이 있어도 마지막 페이지가 비어 보이지 않는다). 순서는 최신순(seq DESC).
     */
    @Transactional(readOnly = true)
    fun getMyBookmarksPage(userId: Long, page: Int, size: Int): PostPageResponse {
        validatePageParams(page, size)
        // 공개 글만 JOIN 으로 페이지·카운트 — 슬라이스와 total 이 함께 숨김/orphan 을 제외해 정합한다.
        val postPage = repo.findVisibleBookmarkedByUser(userId, PageRequest.of(page, size))
        val orderedPosts = postPage.content
        val likedIds = likedByPage(userId, orderedPosts.map { it.id })
        return PostPageResponse(
            content = orderedPosts.map {
                it.toResponse(viewerId = userId, likedByMe = it.id in likedIds, bookmarkedByMe = true)
            },
            page = page,
            size = size,
            totalElements = postPage.totalElements,
            totalPages = totalPages(postPage.totalElements, size),
        )
    }

    @Transactional
    fun getPost(id: String, currentUserId: Long?): PostResponse {
        val post = repo.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "post $id not found")
        }
        // 삭제(soft delete)된 게시글은 작성자에게도 존재하지 않는 것으로 취급한다.
        if (post.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $id not found")
        }
        // 숨김 게시글은 작성자에게만 보인다(hidden 플래그 포함). 그 외에는 존재를 드러내지 않는 404.
        if (post.hiddenAt != null && (post.authorUserId == null || post.authorUserId != currentUserId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $id not found")
        }
        // 교인만 공개는 비로그인에게 존재를 드러내지 않는 404.
        if (post.visibility == PostVisibility.MEMBERS && currentUserId == null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $id not found")
        }
        // 조회수 증가 — 엔티티 dirty checking 대신 원자적 UPDATE 로 동시 조회 유실을 막는다.
        // (incrementViews 는 clearAutomatically 로 영속성 컨텍스트를 비우므로 post 는 이 시점 detached.
        //  detached 엔티티를 변경하지 않고, 응답 views 만 이번 조회분(+1)을 copy 로 반영한다.)
        val viewsAfter = post.views + 1
        repo.incrementViews(id)
        return post.toResponse(
            viewerId = currentUserId,
            likedByMe = currentUserId != null && likeRepo.existsByPostIdAndUserId(id, currentUserId),
            bookmarkedByMe = currentUserId != null && bookmarkRepo.existsByPostIdAndUserId(id, currentUserId),
            prayedByMe = currentUserId != null && prayerRepo.existsByPostIdAndUserId(id, currentUserId),
        ).copy(views = viewsAfter)
    }

    /**
     * 좋아요. 이미 누른 경우 idempotent(200, 증가 없음).
     *
     * 동시성: 트랜잭션 안에서 post row 를 가장 먼저 write lock 으로 잡아 게시글별로 요청을 직렬화한다.
     * 서로 다른 유저의 동시 좋아요에서도 likes 증가가 유실되지 않고, 같은 유저 동시 요청은 lock 보유 중
     * existsBy 재확인으로 idempotent 처리된다. unique 제약은 최종 방어선으로 유지(예외 삼키기 없음).
     */
    @Transactional
    fun likePost(userId: Long, postId: String): PostResponse {
        val post = visibleForUpdateOrNotFound(postId)
        if (!likeRepo.existsByPostIdAndUserId(postId, userId)) {
            likeRepo.save(PostLike("plk-${UUID.randomUUID()}", postId, userId))
            post.likes += 1
            repo.save(post)
            val liker = users.findById(userId).orElseThrow {
                ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found")
            }
            notifications.notify(
                recipientUserId = post.authorUserId,
                actorUserId = userId,
                type = NotificationType.POST_LIKED,
                title = "${liker.name}님이 내 게시글을 좋아합니다",
                body = post.text,
                href = "/posts/$postId",
            )
        }
        return post.toResponse(
            viewerId = userId,
            likedByMe = true,
            bookmarkedByMe = bookmarkRepo.existsByPostIdAndUserId(postId, userId),
        )
    }

    /** 좋아요 취소. 누르지 않은 경우 idempotent(200). likes 는 0 미만으로 내려가지 않음. */
    @Transactional
    fun unlikePost(userId: Long, postId: String): PostResponse {
        // write lock 으로 직렬화 → 서로 다른 유저의 동시 unlike 에서도 감소가 유실되지 않음.
        val post = visibleForUpdateOrNotFound(postId)
        likeRepo.findByPostIdAndUserId(postId, userId)?.let {
            likeRepo.delete(it)
            post.likes = maxOf(0, post.likes - 1)
        }
        return post.toResponse(
            viewerId = userId,
            likedByMe = false,
            bookmarkedByMe = bookmarkRepo.existsByPostIdAndUserId(postId, userId),
        )
    }

    /**
     * '함께 기도했어요' 반응. 기도(PRAYER) 글에만 허용(그 외 400). 이미 누른 경우 idempotent(200, 증가 없음).
     * 익명 집계라 작성자에게 알림을 보내지 않는다(누가 눌렀는지 드러내지 않는다). 동시성은 좋아요와 동일하게
     * post row write lock 으로 직렬화해 prayed_count 증가 유실을 막고, unique 제약을 최종 방어선으로 둔다.
     */
    @Transactional
    fun prayPost(userId: Long, postId: String): PostResponse {
        val post = prayableForUpdateOrNotFound(postId)
        if (!prayerRepo.existsByPostIdAndUserId(postId, userId)) {
            prayerRepo.save(PostPrayer("ppr-${UUID.randomUUID()}", postId, userId))
            post.prayedCount += 1
            repo.save(post)
        }
        return prayResponse(post, userId, prayedByMe = true)
    }

    /** '함께 기도했어요' 취소. 누르지 않은 경우 idempotent(200). prayed_count 는 0 미만으로 내려가지 않음. */
    @Transactional
    fun unprayPost(userId: Long, postId: String): PostResponse {
        val post = prayableForUpdateOrNotFound(postId)
        prayerRepo.findByPostIdAndUserId(postId, userId)?.let {
            prayerRepo.delete(it)
            post.prayedCount = maxOf(0, post.prayedCount - 1)
        }
        return prayResponse(post, userId, prayedByMe = false)
    }

    /**
     * '응답받았어요' 마킹 토글. 기도(PRAYER) 글에만 허용(그 외 400). 작성자 본인 또는 스태프만 가능.
     * answered=true 면 응답 시각을 찍고, false 면 지운다(재마킹은 최초 시각을 갱신).
     */
    @Transactional
    fun setAnswered(userId: Long, postId: String, answered: Boolean): PostResponse {
        val post = prayableForUpdateOrNotFound(postId)
        val isAuthor = post.authorUserId != null && post.authorUserId == userId
        if (!isAuthor && !hasStaffRole()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not allowed to mark this prayer")
        }
        post.answeredAt = if (answered) Instant.now(clock) else null
        return prayResponse(post, userId, prayedByMe = prayerRepo.existsByPostIdAndUserId(postId, userId))
    }

    /** 기도 반응/응답 응답 공통 — 좋아요·북마크 상태도 함께 실어 클라이언트가 단일 응답으로 갱신하게 한다. */
    private fun prayResponse(post: Post, userId: Long, prayedByMe: Boolean): PostResponse =
        post.toResponse(
            viewerId = userId,
            likedByMe = likeRepo.existsByPostIdAndUserId(post.id, userId),
            bookmarkedByMe = bookmarkRepo.existsByPostIdAndUserId(post.id, userId),
            prayedByMe = prayedByMe,
        )

    /**
     * 기도 반응/응답용 write lock 조회. 숨김 글은 존재를 드러내지 않는 404, 기도 카테고리가 아니면 400.
     * (기도 전용 상호작용이 나눔·공지 등 다른 카테고리로 새지 않게 한다.)
     */
    private fun prayableForUpdateOrNotFound(postId: String): Post {
        val post = visibleForUpdateOrNotFound(postId)
        if (post.category != PostCategory.PRAYER) {
            badRequest("기도 반응은 기도 카테고리에서만 가능합니다.")
        }
        return post
    }

    /** 북마크. 이미 저장된 경우에도 idempotent(200). */
    @Transactional
    fun bookmarkPost(userId: Long, postId: String): PostResponse {
        // post row lock 뒤 존재 여부를 재확인해 같은 사용자의 동시 요청을 직렬화한다.
        val post = visibleForUpdateOrNotFound(postId)
        if (!bookmarkRepo.existsByPostIdAndUserId(postId, userId)) {
            bookmarkRepo.save(PostBookmark("pbk-${UUID.randomUUID()}", postId, userId))
        }
        return post.toResponse(
            viewerId = userId,
            likedByMe = likeRepo.existsByPostIdAndUserId(postId, userId),
            bookmarkedByMe = true,
        )
    }

    /** 북마크 취소. 저장되지 않은 경우에도 idempotent(200). */
    @Transactional
    fun unbookmarkPost(userId: Long, postId: String): PostResponse {
        val post = visibleForUpdateOrNotFound(postId)
        bookmarkRepo.findByPostIdAndUserId(postId, userId)?.let(bookmarkRepo::delete)
        return post.toResponse(
            viewerId = userId,
            likedByMe = likeRepo.existsByPostIdAndUserId(postId, userId),
            bookmarkedByMe = false,
        )
    }

    @Transactional
    fun createPost(author: AuthUser, req: CreatePostRequest): PostResponse {
        // @Transactional 로 묶어 normalizeFields 의 event write lock 을 게시글 저장 commit 까지 유지한다.
        // 행사 삭제와 동시에 실행돼도 둘 중 하나만 통과해 orphan eventId 가 남지 않는다.
        val category = normalizeCategory(req.category)
        requireAdminForOfficialCategory(category)
        // 익명 게시는 기도 카테고리 전용 — 나눔/공식 채널에서 실명 원칙을 유지한다.
        if (req.anonymous && category != PostCategory.PRAYER) {
            badRequest("익명 게시는 기도 카테고리에서만 가능합니다.")
        }
        val visibility = normalizeVisibility(req.visibility, category)
        val attachments = normalizeAttachments(category, req.attachments)
        val publishAt = normalizePublishAt(req.publishAt, category)
        val fields = normalizeFields(req.text, req.tags, req.images, req.eventId)
        val profileImageUrl = users.findById(author.id).orElse(null)?.profileImageUrl
        val now = Instant.now(clock)
        return repo.save(
            Post(
                id = "p-${UUID.randomUUID()}",
                author = Author(author.name, author.verified, profileImageUrl),
                time = "방금 전",
                text = fields.text,
                tags = fields.tags,
                images = fields.images,
                likes = 0,
                comments = 0,
                eventId = fields.eventId,
                category = category,
                seq = System.currentTimeMillis(),
                authorUserId = author.id,
                createdAt = now,
                attachments = attachments,
                anonymous = req.anonymous,
                visibility = visibility,
                publishAt = publishAt,
                // 예약 글은 도래 전까지 기존 숨김 경로(공개 목록·검색·상세 제외)를 그대로 탄다.
                // 운영 숨김과는 hiddenReason 마커로 구분 — ScheduledPublishJob 이 이 마커만 공개 전환한다.
                hiddenAt = if (publishAt != null) now else null,
                hiddenReason = if (publishAt != null) SCHEDULED_HIDDEN_REASON else null,
            ),
        ).toResponse(viewerId = author.id, likedByMe = false, bookmarkedByMe = false)
    }

    /** 예약 게시 시각 정규화 — 공지·주보 전용, ISO-8601 미래 시각만. 미지정이면 즉시 게시(null). */
    private fun normalizePublishAt(raw: String?, category: String): Instant? {
        if (raw?.trim().isNullOrEmpty()) return null
        if (category !in PostCategory.ADMIN_ONLY) {
            badRequest("예약 게시는 공지·주보에서만 가능합니다.")
        }
        return requireFuturePublishAt(raw)
    }

    /** ISO-8601 미래 시각 파싱 — 비었거나 형식 오류·과거면 400. 재예약처럼 시각이 필수인 경로에서 쓴다. */
    private fun requireFuturePublishAt(raw: String?): Instant {
        val value = raw?.trim()?.takeIf { it.isNotEmpty() } ?: badRequest("예약 게시 시각을 지정해야 합니다.")
        val parsed = try {
            Instant.parse(value)
        } catch (_: java.time.format.DateTimeParseException) {
            badRequest("예약 게시 시각은 ISO-8601 형식이어야 합니다.")
        }
        if (!parsed.isAfter(Instant.now(clock))) {
            badRequest("예약 게시 시각은 미래여야 합니다.")
        }
        return parsed
    }

    /** 공개 범위 정규화. 미지정=PUBLIC, MEMBERS 는 기도 전용, 그 외 값은 400. */
    private fun normalizeVisibility(raw: String?, category: String): String {
        val value = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return PostVisibility.PUBLIC
        if (value !in PostVisibility.ALL) badRequest("공개 범위는 PUBLIC 또는 MEMBERS 만 가능합니다.")
        if (value == PostVisibility.MEMBERS && category != PostCategory.PRAYER) {
            badRequest("교인만 공개는 기도 카테고리에서만 가능합니다.")
        }
        return value
    }

    /**
     * 공지·주보·설교는 교회 공식 콘텐츠 — 최고 관리자·운영자·콘텐츠 관리자만 쓸 수 있다.
     * 권한은 JWT 클레임이 아니라 JwtAuthFilter 가 매 요청 DB role 로 채운 SecurityContext 기준(회수 즉시 반영).
     */
    private fun requireAdminForOfficialCategory(category: String) {
        if (category !in PostCategory.STAFF_WRITE) return
        if (!hasStaffRole()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "only staff can write this category")
        }
    }

    /** 공지·주보 쓰기 권한(스태프: 최고 관리자·운영자·콘텐츠 관리자) 보유 여부. JwtAuthFilter 가 매 요청 DB role 로 채운 SecurityContext 기준. */
    private fun hasStaffRole(): Boolean {
        val staff = setOf("ROLE_ADMIN", "ROLE_OPERATOR", "ROLE_CONTENT")
        return SecurityContextHolder.getContext().authentication
            ?.authorities?.any { it.authority in staff } == true
    }

    /**
     * 공지·주보 상단 고정 토글. 공식 카테고리 쓰기와 같은 스태프 권한(ADMIN·OPERATOR·CONTENT).
     * 고정은 NOTICE·BULLETIN 에서만 의미가 있다 — 다른 카테고리는 400.
     */
    @Transactional
    fun setPinned(postId: String, pinned: Boolean): PostResponse {
        val post = repo.findById(postId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        }
        if (post.category !in PostCategory.ADMIN_ONLY) {
            badRequest("공지·주보만 고정할 수 있습니다.")
        }
        requireAdminForOfficialCategory(post.category)
        post.pinnedAt = if (pinned) java.time.Instant.now(clock) else null
        return post.toResponse(viewerId = null)
    }

    /**
     * 예약 게시 취소. 예약 대기 중인 글의 예약을 철회한다(삭제 아님) — publishAt 을 비우고 예약 마커를 지워
     * '발행 안 함(일반 숨김)' 상태로 되돌린다. hiddenAt 은 유지 — 취소는 공개가 아니라 미발행이며,
     * 이후 관리자 숨김 해제로 공개하거나 삭제로 처리한다. 발행 완료·미예약 글은 409.
     */
    @Transactional
    fun cancelSchedule(userId: Long, postId: String): PostResponse {
        val post = scheduledPendingForUpdate(userId, postId)
        // 마커를 지우면 isScheduledPending=false — 잡 대상에서 빠지고 관리자 숨김/해제가 정상 동작한다.
        post.publishAt = null
        post.hiddenReason = null
        return post.toResponse(viewerId = userId)
    }

    /**
     * 예약 게시 재예약. 예약 대기 중인 글의 게시 시각만 새 미래 시각으로 바꾼다(과거·형식 오류는 400).
     * 숨김·마커 상태는 그대로라 잡이 새 시각에 공개 전환한다. 발행 완료·미예약 글은 409.
     */
    @Transactional
    fun reschedule(userId: Long, postId: String, publishAtRaw: String?): PostResponse {
        val post = scheduledPendingForUpdate(userId, postId)
        post.publishAt = requireFuturePublishAt(publishAtRaw)
        return post.toResponse(viewerId = userId)
    }

    /**
     * 예약 취소·재예약 공통 로더. 예약 대기 글을 write lock 으로 잡고 권한을 확인한다.
     * 없음/삭제됨=404, 작성자도 스태프도 아니면=403, 예약 대기가 아니면(발행 완료·미예약)=409
     * (AdminContentService 의 예약 대기 CONFLICT 정책과 일관).
     */
    private fun scheduledPendingForUpdate(userId: Long, postId: String): Post {
        val post = repo.findByIdForUpdate(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        if (post.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        }
        val isAuthor = post.authorUserId != null && post.authorUserId == userId
        if (!isAuthor && !hasStaffRole()) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not allowed to modify this schedule")
        }
        if (!post.isScheduledPending()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "예약 게시 대기 중인 글이 아닙니다")
        }
        return post
    }

    /**
     * 게시글 수정. 작성자(authorUserId)만 가능. 소유권은 author.name 이 아니라 authorUserId 로 판정.
     * 정렬·소유권 필드(seq/time/likes/comments/authorUserId/id/author)는 건드리지 않아 목록 순서가 유지된다.
     */
    @Transactional
    fun updatePost(userId: Long, postId: String, req: UpdatePostRequest): PostResponse {
        // 상호작용 API 와 같은 잠금 순서로 게시글 row 를 먼저 잠근다.
        val post = repo.findByIdForUpdate(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        if (post.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        }
        if (post.authorUserId == null || post.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the author")
        }
        val category = normalizeCategory(req.category)
        // 공지·주보로 바꾸는 것뿐 아니라 이미 공지·주보인 글의 수정도 관리자만 가능하다.
        if (post.category in PostCategory.ADMIN_ONLY || category in PostCategory.ADMIN_ONLY) {
            requireAdminForOfficialCategory(category.takeIf { it in PostCategory.ADMIN_ONLY } ?: post.category)
        }
        // 익명 글은 기도 카테고리를 벗어날 수 없다(익명 플래그는 불변 — 마스킹 원칙 유지).
        if (post.anonymous && category != PostCategory.PRAYER) {
            badRequest("익명 게시글은 기도 카테고리에서만 유지할 수 있습니다.")
        }
        // 교인만 공개 글도 기도 카테고리를 벗어날 수 없다(범위 축소 없이 노출되는 것을 방지).
        if (post.visibility == PostVisibility.MEMBERS && category != PostCategory.PRAYER) {
            badRequest("교인만 공개 게시글은 기도 카테고리에서만 유지할 수 있습니다.")
        }
        val attachments = normalizeAttachments(category, req.attachments)
        val fields = normalizeFields(req.text, req.tags, req.images, req.eventId)
        post.text = fields.text
        post.tags = fields.tags
        post.images = fields.images
        post.eventId = fields.eventId
        post.category = category
        post.attachments = attachments
        post.updatedAt = Instant.now(clock)
        return post.toResponse(
            viewerId = userId,
            likedByMe = likeRepo.existsByPostIdAndUserId(postId, userId),
            bookmarkedByMe = bookmarkRepo.existsByPostIdAndUserId(postId, userId),
        )
    }

    /**
     * 게시글 삭제(soft delete). 작성자만 가능. row 를 지우지 않고 deletedAt 을 마킹해
     * 신고 대상 보존·복구 여지를 남긴다. hiddenAt 을 함께 세팅해 공개 노출 제외
     * (목록/검색/sitemap/상호작용 404)를 그대로 재사용하며, 좋아요/북마크/댓글 row 도 남긴다.
     * 삭제된 게시글은 존재하지 않는 것으로 취급한다(다시 삭제하면 404).
     */
    @Transactional
    fun deletePost(userId: Long, postId: String) {
        val post = repo.findByIdForUpdate(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        if (post.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        }
        if (post.authorUserId == null || post.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the author")
        }
        val now = Instant.now(clock)
        post.deletedAt = now
        if (post.hiddenAt == null) post.hiddenAt = now
    }

    /** 생성·수정 공통 검증/정규화. 결과가 어긋나지 않도록 한 곳에서 처리. */
    private fun normalizeFields(
        text: String,
        tags: List<String>,
        images: List<String>,
        eventId: String?,
    ): NormalizedFields {
        val (normalizedText, mergedImages) = normalizePostFields(text, images)
        val cid = eventId?.trim()?.ifBlank { null }
        // 단순 existsById 면 확인과 저장 사이에 행사가 삭제돼 orphan eventId 가 생길 수 있다.
        // write lock 으로 행사를 잡아 두면 삭제가 게시글 commit 까지 직렬화돼 orphan 을 막는다.
        // create/update 모두 @Transactional 이라 lock 이 트랜잭션 종료까지 유지된다.
        if (cid != null && events.findByIdForUpdate(cid).let { it == null || it.deletedAt != null }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "event not found")
        }
        return NormalizedFields(normalizedText, normalizeTags(tags), mergedImages, cid)
    }

    private data class NormalizedFields(
        val text: String,
        val tags: List<String>,
        val images: List<String>,
        val eventId: String?,
    )

    /**
     * 상호작용(좋아요/북마크)용 write lock 조회. 숨김 게시글은 작성자 여부와 무관하게
     * 존재를 드러내지 않는 404 로 차단한다(수정/삭제는 작성자 권한 경로라 별도).
     */
    private fun visibleForUpdateOrNotFound(postId: String): Post {
        val post = repo.findByIdForUpdate(postId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        if (post.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "post $postId not found")
        }
        return post
    }

    private fun validatePageParams(page: Int, size: Int) = checkPageParams(page, size, MAX_SEARCH_PAGE_SIZE)

    /** 현재 page 의 postId 만 대상으로 좋아요 bulk 조회. 비로그인/빈 page 면 query 생략. */
    private fun likedByPage(userId: Long?, postIds: List<String>): Set<String> =
        presenceByPage(userId, postIds) { uid, ids -> likeRepo.findByUserIdAndPostIdIn(uid, ids).map { it.postId } }

    /** 현재 page 의 postId 만 대상으로 북마크 bulk 조회. 비로그인/빈 page 면 query 생략. */
    private fun bookmarkedByPage(userId: Long?, postIds: List<String>): Set<String> =
        presenceByPage(userId, postIds) { uid, ids -> bookmarkRepo.findByUserIdAndPostIdIn(uid, ids).map { it.postId } }

    /** 현재 page 의 postId 만 대상으로 '함께 기도했어요' bulk 조회. 비로그인/빈 page 면 query 생략. */
    private fun prayedByPage(userId: Long?, postIds: List<String>): Set<String> =
        presenceByPage(userId, postIds) { uid, ids -> prayerRepo.findByUserIdAndPostIdIn(uid, ids).map { it.postId } }
}
