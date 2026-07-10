package com.hanbit.api.event

import com.hanbit.api.auth.UserRepository
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.common.ListingLimits.MAX_SEARCH_PAGE_SIZE
import com.hanbit.api.common.ListingLimits.MAX_SEARCH_QUERY_LENGTH
import com.hanbit.api.common.ListingLimits.MAX_SITEMAP_PAGE_SIZE
import com.hanbit.api.common.SitemapIdsResponse
import com.hanbit.api.common.presenceByPage
import com.hanbit.api.common.totalPages
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import com.hanbit.api.post.Author
import com.hanbit.api.post.PostRepository
import com.hanbit.api.security.AuthUser
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * 행사 도메인 서비스. 목록/검색/상세, 작성/수정/삭제, 모집 상태 변경, 내 행사/참여 행사 정책을 담당한다.
 * Controller 에서 옮겨온 validation, 날짜 정규화, 소유권 판정, 모집 상태 전이, N+1 회피 bulk 조회, row lock, 트랜잭션을 이 계층에 둔다.
 */
@Service
class EventService(
    private val repo: EventRepository,
    private val eventSearch: EventSearchRepository,
    private val users: UserRepository,
    private val participants: EventParticipantRepository,
    private val bookmarkRepo: EventBookmarkRepository,
    private val posts: PostRepository,
    private val comments: EventCommentRepository,
    private val proofs: EventProofRepository,
    private val clock: Clock,
    private val notifications: NotificationService,
) {
    @Transactional(readOnly = true)
    fun listEvents(currentUserId: Long?): List<EventResponse> {
        val today = LocalDate.now(clock)
        val events = repo.findByHiddenAtIsNull(Sort.by(Sort.Direction.DESC, "seq"))
        // N+1 회피: 내가 참여·북마크한 eventId 를 각각 한 번에 조회.
        val joinedIds = joinedByPage(currentUserId, events.map { it.id })
        val bookmarkedIds = bookmarkedByPage(currentUserId, events.map { it.id })
        return events.map {
            it.toResponse(
                viewerId = currentUserId,
                joinedByMe = it.id in joinedIds,
                bookmarkedByMe = it.id in bookmarkedIds,
                today = today,
            )
        }
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

    /** 공개 검색. content/count는 Querydsl로 분리하고 현재 page의 참여 상태만 bulk 조회한다. */
    @Transactional(readOnly = true)
    fun searchEvents(
        currentUserId: Long?,
        q: String?,
        status: String?,
        recruitState: String?,
        availableOnly: Boolean,
        sort: String,
        page: Int,
        size: Int,
        recruitEndFrom: String?,
        recruitEndTo: String?,
        runStartFrom: String?,
        runStartTo: String?,
    ): EventSearchResponse {
        checkPageParams(page, size, MAX_SEARCH_PAGE_SIZE)

        val query = q?.trim()?.takeIf { it.isNotEmpty() }
        if (query != null && query.length > MAX_SEARCH_QUERY_LENGTH) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "q must not exceed $MAX_SEARCH_QUERY_LENGTH characters",
            )
        }
        if (status != null && status !in EVENT_STATUSES) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid event status")
        }
        val recruitStateFilter = when (recruitState) {
            null -> null
            "before_recruit" -> EventRecruitState.BEFORE_RECRUIT
            "recruiting" -> EventRecruitState.RECRUITING
            "ended" -> EventRecruitState.ENDED
            "closed" -> EventRecruitState.CLOSED
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid event recruitState")
        }
        val searchSort = when (sort) {
            "latest" -> EventSearchSort.LATEST
            "popular" -> EventSearchSort.POPULAR
            "deadline" -> EventSearchSort.DEADLINE
            "relevance" -> EventSearchSort.RELEVANCE
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid event sort")
        }
        val normalizedRecruitEndFrom = normalizeOptionalEventSearchDate(recruitEndFrom, "recruitEndFrom")
        val normalizedRecruitEndTo = normalizeOptionalEventSearchDate(recruitEndTo, "recruitEndTo")
        val normalizedRunStartFrom = normalizeOptionalEventSearchDate(runStartFrom, "runStartFrom")
        val normalizedRunStartTo = normalizeOptionalEventSearchDate(runStartTo, "runStartTo")
        if (normalizedRecruitEndFrom != null &&
            normalizedRecruitEndTo != null &&
            normalizedRecruitEndFrom > normalizedRecruitEndTo
        ) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "recruitEndFrom must be on or before recruitEndTo",
            )
        }
        if (normalizedRunStartFrom != null &&
            normalizedRunStartTo != null &&
            normalizedRunStartFrom > normalizedRunStartTo
        ) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "runStartFrom must be on or before runStartTo",
            )
        }

        val today = LocalDate.now(clock)
        val result = eventSearch.search(
            EventSearchCondition(
                query = query,
                status = status,
                recruitState = recruitStateFilter,
                availableOnly = availableOnly,
                recruitEndFrom = normalizedRecruitEndFrom,
                recruitEndTo = normalizedRecruitEndTo,
                runStartFrom = normalizedRunStartFrom,
                runStartTo = normalizedRunStartTo,
                today = today.toString(),
                sort = searchSort,
                page = page,
                size = size,
            ),
        )
        val joinedIds = joinedByPage(currentUserId, result.content.map { it.id })
        val bookmarkedIds = bookmarkedByPage(currentUserId, result.content.map { it.id })

        return EventSearchResponse(
            content = result.content.map {
                it.toResponse(
                    viewerId = currentUserId,
                    joinedByMe = it.id in joinedIds,
                    bookmarkedByMe = it.id in bookmarkedIds,
                    today = today,
                )
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    /**
     * 현재 사용자가 참여한 행사 목록. 인증 필수.
     * 1) participant 조회(user_id 인덱스) → eventId 목록 추출
     * 2) event IN 조회(seq DESC) → N+1 없이 2쿼리 완료
     * 삭제된 행사의 orphan participant 는 자동으로 결과에서 제외.
     */
    @Transactional(readOnly = true)
    fun getJoinedEvents(userId: Long): List<EventResponse> {
        val today = LocalDate.now(clock)
        val eventIds = participants.findByUserId(userId).map { it.eventId }
        if (eventIds.isEmpty()) return emptyList()
        val bookmarkedIds = bookmarkRepo.findByUserIdAndEventIdIn(userId, eventIds).map { it.eventId }.toSet()
        return repo.findAllByIdInAndHiddenAtIsNullOrderBySeqDesc(eventIds)
            .map { it.toResponse(viewerId = userId, joinedByMe = true, bookmarkedByMe = it.id in bookmarkedIds, today = today) }
    }

    /** 현재 사용자가 개설한 행사. 행사와 참여 상태를 각각 bulk 조회해 N+1을 피한다. */
    @Transactional(readOnly = true)
    fun getMyEvents(userId: Long): List<EventResponse> {
        val today = LocalDate.now(clock)
        val events = repo.findByAuthorUserIdAndDeletedAtIsNullOrderBySeqDesc(userId)
        if (events.isEmpty()) return emptyList()

        val joinedIds = participants.findByUserIdAndEventIdIn(userId, events.map { it.id })
            .map { it.eventId }
            .toSet()
        val bookmarkedIds = bookmarkRepo.findByUserIdAndEventIdIn(userId, events.map { it.id })
            .map { it.eventId }
            .toSet()
        return events.map {
            it.toResponse(
                viewerId = userId,
                joinedByMe = it.id in joinedIds,
                bookmarkedByMe = it.id in bookmarkedIds,
                today = today,
            )
        }
    }

    /**
     * 참여 행사 pagination. participant row 를 id ASC(deterministic, 참여 일시 없음)로 page 한 뒤
     * 해당 page 의 eventId 만 bulk 조회하고 participant page 순서를 보존한다. 삭제된 행사의 orphan 은 제외.
     */
    @Transactional(readOnly = true)
    fun getJoinedEventsPage(userId: Long, page: Int, size: Int): EventPageResponse {
        validatePageParams(page, size)
        val today = LocalDate.now(clock)
        val participantPage = participants.findByUserId(userId, PageRequest.of(page, size, Sort.by("id").ascending()))
        val eventIds = participantPage.content.map { it.eventId }
        val byId = if (eventIds.isEmpty()) emptyMap() else repo.findAllById(eventIds).associateBy { it.id }
        // participant page 순서 보존, orphan·숨김 행사 제외
        val ordered = eventIds.mapNotNull { byId[it] }.filter { it.hiddenAt == null }
        val bookmarkedIds = bookmarkedByPage(userId, ordered.map { it.id })
        return EventPageResponse(
            content = ordered.map {
                it.toResponse(viewerId = userId, joinedByMe = true, bookmarkedByMe = it.id in bookmarkedIds, today = today)
            },
            page = page,
            size = size,
            totalElements = participantPage.totalElements,
            totalPages = totalPages(participantPage.totalElements, size),
        )
    }

    /** 개설 행사 pagination. 최신순(seq DESC, id). 현재 page 의 id 만 대상으로 참여 상태 bulk 조회. */
    @Transactional(readOnly = true)
    fun getMyEventsPage(userId: Long, page: Int, size: Int): EventPageResponse {
        validatePageParams(page, size)
        val today = LocalDate.now(clock)
        val result = repo.findByAuthorUserIdAndDeletedAtIsNull(
            userId,
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "seq").and(Sort.by("id"))),
        )
        val joinedIds = joinedByPage(userId, result.content.map { it.id })
        val bookmarkedIds = bookmarkedByPage(userId, result.content.map { it.id })
        return EventPageResponse(
            content = result.content.map {
                it.toResponse(
                    viewerId = userId,
                    joinedByMe = it.id in joinedIds,
                    bookmarkedByMe = it.id in bookmarkedIds,
                    today = today,
                )
            },
            page = page,
            size = size,
            totalElements = result.totalElements,
            totalPages = totalPages(result.totalElements, size),
        )
    }

    @Transactional(readOnly = true)
    fun getEvent(id: String, currentUserId: Long?): EventResponse {
        val event = repo.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "event $id not found")
        }
        // 삭제(soft delete)된 행사는 개설자에게도 존재하지 않는 것으로 취급한다.
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $id not found")
        }
        // 숨김 행사는 개설자에게만 보인다(hidden 플래그 포함). 그 외에는 존재를 드러내지 않는 404.
        if (event.hiddenAt != null && (event.authorUserId == null || event.authorUserId != currentUserId)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $id not found")
        }
        return event.toResponse(
            viewerId = currentUserId,
            joinedByMe = currentUserId != null && participants.existsByEventIdAndUserId(id, currentUserId),
            bookmarkedByMe = currentUserId != null && bookmarkRepo.existsByEventIdAndUserId(id, currentUserId),
            today = LocalDate.now(clock),
        )
    }

    /** 상태 변경 결과 + 락 해제 후 보낼 알림 정보. recipients 가 비면 알림 없음(멱등 재요청 등). */
    /** 행사 수정 결과 — 커밋 후 안내 변경 알림 팬아웃용(모집중 수정에서만 수신자가 채워진다). */
    data class EventUpdateResult(
        val response: EventResponse,
        val notifyRecipientIds: List<Long>,
        val eventTitle: String,
    )

    data class StatusChangeResult(
        val response: EventResponse,
        val notifyRecipientIds: List<Long>,
        val notifyTitle: String,
        val eventTitle: String,
    )

    /**
     * 행사 모집 상태 변경. join 과 같은 row lock 을 가장 먼저 잡아 참여·마감 요청을 직렬화한다.
     * upcoming → open → closed 단방향 전환만 허용하며 같은 상태 요청은 멱등 처리한다.
     * 알림 팬아웃은 수신자 계산까지만 여기서 하고, 실제 생성은 커밋(락 해제) 후
     * notifyStatusChanged() 별도 트랜잭션에서 한다 — 락 보유 시간에서 알림 INSERT 를 제거.
     */
    @Transactional
    fun updateStatus(userId: Long, eventId: String, req: UpdateEventStatusRequest): StatusChangeResult {
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.authorUserId == null || event.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }

        val target = req.status
        if (target != "open" && target != "closed") {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid event status")
        }

        if (event.status != target) {
            when {
                event.status == "upcoming" && target == "open" -> {
                    event.status = "open"
                    event.daysLeftLabel = "모집중"
                }
                event.status == "open" && target == "closed" -> {
                    event.status = "closed"
                    event.daysLeftLabel = "모집완료"
                }
                else -> throw ResponseStatusException(HttpStatus.CONFLICT, "invalid status transition")
            }
            val title = if (target == "open") "모집이 시작되었습니다" else "모집이 마감되었습니다"
            // 수신자 계산만 락 안에서(참여자 스냅샷 확정). 알림 INSERT 는 컨트롤러가 커밋 후
            // notifyStatusChanged() 로 수행한다. notifyEventUpdates 필터를 위해 유저를 bulk 로드.
            val recipientIds = participants.findByEventId(eventId)
                .map { it.userId }
                .filter { it != userId }
                .distinct()
            val notifyIds = users.findAllById(recipientIds)
                .filter { it.notifyEventUpdates }
                .mapNotNull { it.id }
            return StatusChangeResult(
                response = event.toResponse(
                    viewerId = userId,
                    joinedByMe = participants.existsByEventIdAndUserId(eventId, userId),
                    bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, userId),
                    today = LocalDate.now(clock),
                ),
                notifyRecipientIds = notifyIds,
                notifyTitle = title,
                eventTitle = event.title,
            )
        }

        // 같은 상태로의 멱등 재요청 — 상태 변화가 없으므로 알림도 없다.
        return StatusChangeResult(
            response = event.toResponse(
                viewerId = userId,
                joinedByMe = participants.existsByEventIdAndUserId(eventId, userId),
                bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, userId),
                today = LocalDate.now(clock),
            ),
            notifyRecipientIds = emptyList(),
            notifyTitle = "",
            eventTitle = event.title,
        )
    }

    /**
     * 상태 변경 알림 팬아웃 — updateStatus 커밋(행 락 해제) 후 컨트롤러가 호출한다.
     * 별도 트랜잭션이므로 실패해도 상태 변경은 유지된다(알림은 best-effort).
     */
    @Transactional
    fun notifyStatusChanged(actorUserId: Long, eventId: String, result: StatusChangeResult) {
        result.notifyRecipientIds.forEach { recipientId ->
            notifications.notify(
                recipientUserId = recipientId,
                actorUserId = actorUserId,
                type = NotificationType.EVENT_STATUS_CHANGED,
                title = result.notifyTitle,
                body = result.eventTitle,
                href = "/events/$eventId",
            )
        }
    }

    /** 현재 사용자가 저장한 행사. 북마크/행사/참여를 각각 bulk 조회해 N+1을 피한다. */
    @Transactional(readOnly = true)
    fun getMyBookmarks(userId: Long): List<EventResponse> {
        val today = LocalDate.now(clock)
        val eventIds = bookmarkRepo.findByUserId(userId).map { it.eventId }.distinct()
        if (eventIds.isEmpty()) return emptyList()

        val events = repo.findAllByIdInAndHiddenAtIsNullOrderBySeqDesc(eventIds)
        val joinedIds = participants.findByUserIdAndEventIdIn(userId, eventIds)
            .map { it.eventId }
            .toSet()
        return events.map {
            it.toResponse(viewerId = userId, joinedByMe = it.id in joinedIds, bookmarkedByMe = true, today = today)
        }
    }

    /**
     * 저장한 행사 pagination. bookmark row 를 id ASC(deterministic, createdAt 없음)로 page 한 뒤
     * 해당 page 의 eventId 만 bulk 조회하고 bookmark page 순서를 보존한다. 삭제된 행사의 orphan bookmark 는 제외.
     */
    @Transactional(readOnly = true)
    fun getMyBookmarksPage(userId: Long, page: Int, size: Int): EventPageResponse {
        validatePageParams(page, size)
        val today = LocalDate.now(clock)
        val bookmarkPage = bookmarkRepo.findByUserId(userId, PageRequest.of(page, size, Sort.by("id").ascending()))
        val eventIds = bookmarkPage.content.map { it.eventId }
        val eventsById = if (eventIds.isEmpty()) emptyMap() else repo.findAllById(eventIds).associateBy { it.id }
        // bookmark page 순서 보존, orphan·숨김 행사 제외
        val ordered = eventIds.mapNotNull { eventsById[it] }.filter { it.hiddenAt == null }
        val joinedIds = joinedByPage(userId, ordered.map { it.id })
        return EventPageResponse(
            content = ordered.map {
                it.toResponse(viewerId = userId, joinedByMe = it.id in joinedIds, bookmarkedByMe = true, today = today)
            },
            page = page,
            size = size,
            totalElements = bookmarkPage.totalElements,
            totalPages = totalPages(bookmarkPage.totalElements, size),
        )
    }

    /** 북마크. 이미 저장된 경우에도 idempotent(200). */
    @Transactional
    fun bookmarkEvent(userId: Long, eventId: String): EventResponse {
        val event = visibleForUpdateOrNotFound(eventId)
        if (!bookmarkRepo.existsByEventIdAndUserId(eventId, userId)) {
            bookmarkRepo.save(EventBookmark("cbk-${UUID.randomUUID()}", eventId, userId))
        }
        return event.toResponse(
            viewerId = userId,
            joinedByMe = participants.existsByEventIdAndUserId(eventId, userId),
            bookmarkedByMe = true,
            today = LocalDate.now(clock),
        )
    }

    /** 북마크 취소. 저장되지 않은 경우에도 idempotent(200). */
    @Transactional
    fun unbookmarkEvent(userId: Long, eventId: String): EventResponse {
        val event = visibleForUpdateOrNotFound(eventId)
        bookmarkRepo.findByEventIdAndUserId(eventId, userId)?.let(bookmarkRepo::delete)
        return event.toResponse(
            viewerId = userId,
            joinedByMe = participants.existsByEventIdAndUserId(eventId, userId),
            bookmarkedByMe = false,
            today = LocalDate.now(clock),
        )
    }

    /** 모집 시작 전 행사 수정. 상태 변경과 같은 row lock 을 가장 먼저 잡아 요청을 직렬화한다. */
    @Transactional
    fun updateEvent(userId: Long, eventId: String, req: UpdateEventRequest): EventUpdateResult {
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.authorUserId == null || event.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }
        // upcoming: 전체 수정. open(모집중): 참여 판단에 영향 없는 안내 정보만 — 제목·기간·정원은 잠근다
        // (참여자가 신청한 조건을 바꾸지 않기 위해). closed: 수정 불가.
        if (event.status == "closed") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "closed events cannot be updated")
        }

        val input = normalizeEventInput(
            req.title, req.summary, req.body, req.thumb,
            req.recruitStart, req.recruitEnd, req.runStart, req.runEnd, req.capacity,
            req.place, req.audience, req.fee, req.supplies, req.contact,
        )
        // 모집중 잠금 검사 — 필드 대입 전에 해야 원본과 비교된다.
        if (event.status == "open") {
            val lockedChanged = input.title != event.title ||
                input.recruitStart != event.recruitStart || input.recruitEnd != event.recruitEnd ||
                input.runStart != event.runStart || input.runEnd != event.runEnd ||
                input.capacity != event.capacity
            if (lockedChanged) {
                throw ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "모집중에는 제목·모집/진행 기간·정원을 변경할 수 없습니다. 안내 정보만 수정할 수 있어요.",
                )
            }
        }
        event.title = input.title
        event.summary = input.summary
        event.thumb = input.thumb
        event.recruitStart = input.recruitStart
        event.recruitEnd = input.recruitEnd
        event.runStart = input.runStart
        event.runEnd = input.runEnd
        event.capacity = input.capacity
        event.body = input.body
        event.place = input.place
        event.audience = input.audience
        event.fee = input.fee
        event.supplies = input.supplies
        event.contact = input.contact
        event.updatedAt = Instant.now(clock)

        // 모집중 안내 수정은 이미 신청한 참여자에게 알린다(상태 팬아웃과 동일하게 수신자만 락 안에서 확정).
        val notifyIds = if (event.status == "open") {
            val recipientIds = participants.findByEventId(eventId)
                .map { it.userId }
                .filter { it != userId }
                .distinct()
            users.findAllById(recipientIds).filter { it.notifyEventUpdates }.mapNotNull { it.id }
        } else {
            emptyList()
        }

        return EventUpdateResult(
            response = event.toResponse(
                viewerId = userId,
                joinedByMe = participants.existsByEventIdAndUserId(eventId, userId),
                bookmarkedByMe = bookmarkRepo.existsByEventIdAndUserId(eventId, userId),
                today = LocalDate.now(clock),
            ),
            notifyRecipientIds = notifyIds,
            eventTitle = event.title,
        )
    }

    /** 안내 변경 알림 팬아웃 — updateEvent 커밋(행 락 해제) 후 컨트롤러가 호출한다. best-effort. */
    @Transactional
    fun notifyDetailsUpdated(actorUserId: Long, eventId: String, result: EventUpdateResult) {
        result.notifyRecipientIds.forEach { recipientId ->
            notifications.notify(
                recipientUserId = recipientId,
                actorUserId = actorUserId,
                type = com.hanbit.api.notification.NotificationType.EVENT_DETAILS_UPDATED,
                title = "행사 안내가 수정되었습니다",
                body = result.eventTitle,
                href = "/events/$eventId",
            )
        }
    }

    @Transactional
    fun createEvent(user: AuthUser, req: CreateEventRequest): EventResponse {
        val input = normalizeEventInput(
            req.title, req.summary, req.body, req.thumb,
            req.recruitStart, req.recruitEnd, req.runStart, req.runEnd, req.capacity,
            req.place, req.audience, req.fee, req.supplies, req.contact,
        )

        return repo.save(
            Event(
                id = "c-${UUID.randomUUID()}",
                status = "upcoming",
                title = input.title,
                summary = input.summary,
                thumb = input.thumb,
                recruitStart = input.recruitStart,
                recruitEnd = input.recruitEnd,
                runStart = input.runStart,
                runEnd = input.runEnd,
                capacity = input.capacity,
                joined = 0,
                daysLeftLabel = "모집예정",
                author = Author(
                    user.name,
                    user.verified,
                    users.findById(user.id).orElse(null)?.profileImageUrl,
                ),
                body = input.body,
                seq = System.currentTimeMillis(),
                authorUserId = user.id,
                place = input.place,
                audience = input.audience,
                fee = input.fee,
                supplies = input.supplies,
                contact = input.contact,
            ),
        ).toResponse(viewerId = user.id, joinedByMe = false, bookmarkedByMe = false, today = LocalDate.now(clock))
    }

    /**
     * 모집 예정 행사 삭제. 개설자만, status=upcoming 이고 참여자·연결 게시글이 없을 때만 허용한다.
     *
     * 잠금 순서는 다른 행사 변경 API(join/status/update)와 같이 event row lock 을 가장 먼저 잡아
     * 같은 행사의 삭제·참여·수정·모집시작을 직렬화한다. 연결 게시글 존재 확인도 이 lock 안에서 하므로,
     * 게시글 생성(event write lock 보유)과 동시에 실행돼도 둘 중 하나만 통과해 orphan eventId 가 남지 않는다.
     * soft delete 미도입 → 이미 지워진 행사를 다시 삭제하면 404.
     */
    @Transactional
    fun deleteEvent(userId: Long, eventId: String) {
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        if (event.authorUserId == null || event.authorUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "not the event owner")
        }
        if (event.status != "upcoming") {
            throw ResponseStatusException(HttpStatus.CONFLICT, "only upcoming events can be deleted")
        }
        // 참여 카운터와 participant row 가 불일치해도 둘 중 하나라도 0 이 아니면 삭제를 거부한다.
        if (event.joined != 0 || participants.countByEventId(eventId) != 0L) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event has participants")
        }
        if (posts.existsByEventId(eventId)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "event has linked posts")
        }
        // soft delete: row 는 남기고 deletedAt/hiddenAt 을 마킹한다(신고 대상 보존·복구 여지).
        // 댓글/북마크 row 도 남긴다 — 공개 노출은 hiddenAt 재사용으로 이미 차단된다.
        val now = Instant.now(clock)
        event.deletedAt = now
        if (event.hiddenAt == null) event.hiddenAt = now
    }

    /**
     * 상호작용(북마크)용 write lock 조회. 숨김 행사는 존재를 드러내지 않는 404 로 차단한다
     * (개설자 권한 경로인 상태 변경/수정/삭제는 별도 — 숨김 상태에서도 허용).
     */
    private fun visibleForUpdateOrNotFound(eventId: String): Event {
        val event = repo.findByIdForUpdate(eventId)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        if (event.hiddenAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "event $eventId not found")
        }
        return event
    }

    private fun validatePageParams(page: Int, size: Int) = checkPageParams(page, size, MAX_SEARCH_PAGE_SIZE)

    /** 현재 page 의 eventId 만 대상으로 참여 상태 bulk 조회. 비로그인/빈 page 면 query 생략. */
    private fun joinedByPage(userId: Long?, eventIds: List<String>): Set<String> =
        presenceByPage(userId, eventIds) { uid, ids -> participants.findByUserIdAndEventIdIn(uid, ids).map { it.eventId } }

    /** 현재 page 의 eventId 만 대상으로 북마크 bulk 조회. 비로그인/빈 page 면 query 생략. */
    private fun bookmarkedByPage(userId: Long?, eventIds: List<String>): Set<String> =
        presenceByPage(userId, eventIds) { uid, ids -> bookmarkRepo.findByUserIdAndEventIdIn(uid, ids).map { it.eventId } }

    private companion object {
        val EVENT_STATUSES = setOf("open", "upcoming", "closed")
    }
}
