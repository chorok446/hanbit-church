package com.hanbit.api.event

import com.hanbit.api.common.CommentPageLocationResponse
import com.hanbit.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** HTTP adapter. 후기 작성자 추출 후 Service 위임과 status code 반환만 담당한다. */
@RestController
@RequestMapping("/api/events")
@Tag(name = "Events", description = "행사 및 행사 댓글 API")
class EventController(
    private val eventService: EventService,
    private val participantService: EventParticipantService,
    private val commentService: EventCommentService,
    private val proofService: EventProofService,
    private val calendarIcs: com.hanbit.api.calendar.CalendarIcsService,
) {
    @Operation(summary = "행사 목록 조회", description = "공개 API. JWT 가 있으면 사용자별 참여/소유 상태를 포함한다.")
    @GetMapping
    fun list(@AuthenticationPrincipal user: AuthUser?): List<EventResponse> =
        eventService.listEvents(user?.id)

    @Operation(summary = "행사 검색", description = "공개 API. JWT 가 있으면 사용자별 상태를 포함한다.")
    @GetMapping("/search")
    fun search(
        @RequestParam(name = "q", required = false) q: String?,
        @RequestParam(required = false) status: String?,
        @RequestParam(required = false) recruitState: String?,
        @RequestParam(defaultValue = "false") availableOnly: Boolean,
        @RequestParam(defaultValue = "latest") sort: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "9") size: Int,
        @RequestParam(required = false) recruitEndFrom: String?,
        @RequestParam(required = false) recruitEndTo: String?,
        @RequestParam(required = false) runStartFrom: String?,
        @RequestParam(required = false) runStartTo: String?,
        @AuthenticationPrincipal user: AuthUser?,
    ): EventSearchResponse = eventService.searchEvents(
        user?.id, q, status, recruitState, availableOnly, sort, page, size,
        recruitEndFrom, recruitEndTo, runStartFrom, runStartTo,
    )

    @Operation(summary = "참여 행사 조회")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/joined")
    fun joined(@AuthenticationPrincipal user: AuthUser): List<EventResponse> =
        eventService.getJoinedEvents(user.id)

    @Operation(summary = "내 행사 조회")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/mine")
    fun mine(@AuthenticationPrincipal user: AuthUser): List<EventResponse> =
        eventService.getMyEvents(user.id)

    @Operation(summary = "참여 행사 조회(pagination)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/joined/page")
    fun joinedPage(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "9") size: Int,
        @AuthenticationPrincipal user: AuthUser,
    ): EventPageResponse = eventService.getJoinedEventsPage(user.id, page, size)

    @Operation(summary = "내 행사 조회(pagination)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/mine/page")
    fun minePage(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "9") size: Int,
        @AuthenticationPrincipal user: AuthUser,
    ): EventPageResponse = eventService.getMyEventsPage(user.id, page, size)

    @Operation(summary = "내 북마크 조회")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/bookmarks")
    fun bookmarks(@AuthenticationPrincipal user: AuthUser): List<EventResponse> =
        eventService.getMyBookmarks(user.id)

    @Operation(summary = "내 북마크 조회(pagination)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/bookmarks/page")
    fun bookmarksPage(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "9") size: Int,
        @AuthenticationPrincipal user: AuthUser,
    ): EventPageResponse = eventService.getMyBookmarksPage(user.id, page, size)

    @Operation(summary = "sitemap용 행사 id 목록", description = "공개 API. id 만 페이지 단위로 반환한다.")
    @GetMapping("/sitemap-ids")
    fun sitemapIds(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "500") size: Int,
    ) = eventService.listSitemapIds(page, size)

    @Operation(summary = "행사 상세 조회", description = "공개 API. JWT 가 있으면 사용자별 참여/소유 상태를 포함한다.")
    @GetMapping("/{id}")
    fun get(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser?): EventResponse =
        eventService.getEvent(id, user?.id)

    @Operation(summary = "행사 .ics 다운로드", description = "공개 API. 캘린더 앱에 일정으로 추가할 수 있다. 숨김·삭제 행사는 404.")
    @GetMapping("/{id}/ics", produces = ["text/calendar;charset=UTF-8"])
    fun ics(@PathVariable id: String): org.springframework.http.ResponseEntity<String> =
        org.springframework.http.ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"event-$id.ics\"")
            .body(calendarIcs.buildSingleEvent(id))

    @Operation(summary = "참가자 목록 조회", description = "행사 개설자만 조회할 수 있다.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{id}/participants")
    fun participants(
        @PathVariable id: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal user: AuthUser,
    ): EventParticipantsResponse = participantService.getParticipants(user.id, id, page, size)

    @Operation(summary = "참가자 명단 CSV 다운로드", description = "행사 개설자만. 이름·인증 여부만 담는다.")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/{id}/participants/export")
    fun exportParticipants(
        @PathVariable id: String,
        @AuthenticationPrincipal user: AuthUser,
    ): org.springframework.http.ResponseEntity<ByteArray> {
        val csv = participantService.exportParticipantsCsv(user.id, id)
        return org.springframework.http.ResponseEntity.ok()
            .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"${csv.filename}\"")
            .header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store")
            .contentType(org.springframework.http.MediaType.parseMediaType("text/csv;charset=UTF-8"))
            .body(csv.bytes)
    }

    @Operation(summary = "참가자 퇴장", description = "행사 개설자만 참가자를 퇴장시킬 수 있다.")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}/participants/{participantId}")
    fun removeParticipant(
        @PathVariable id: String,
        @PathVariable participantId: String,
        @AuthenticationPrincipal user: AuthUser,
    ): EventParticipantRemovalResponse {
        val result = participantService.removeParticipant(user.id, id, participantId)
        participantService.notifySeatOpened(user.id, id, result.eventTitle, result.seatNoticeRecipientIds)
        return result.response
    }

    @Operation(summary = "행사 참여")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{id}/join")
    fun join(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser): EventResponse =
        participantService.joinEvent(user, id)

    @Operation(summary = "북마크")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{id}/bookmark")
    fun bookmark(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser): EventResponse =
        eventService.bookmarkEvent(user.id, id)

    @Operation(summary = "북마크 취소")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}/bookmark")
    fun unbookmark(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser): EventResponse =
        eventService.unbookmarkEvent(user.id, id)

    @Operation(summary = "행사 참여 취소")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}/join")
    fun leave(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser): EventResponse {
        val result = participantService.leaveEvent(user.id, id)
        participantService.notifySeatOpened(user.id, id, result.eventTitle, result.seatNoticeRecipientIds)
        return result.response
    }

    @Operation(summary = "모집 상태 변경")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}/status")
    fun updateStatus(
        @PathVariable id: String,
        @RequestBody req: UpdateEventStatusRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventResponse {
        // 상태 변경(행 락) 커밋 후 알림 팬아웃 — 락 보유 시간에서 알림 INSERT 를 제거한다.
        val result = eventService.updateStatus(user.id, id, req)
        if (result.notifyRecipientIds.isNotEmpty()) {
            runCatching { eventService.notifyStatusChanged(user.id, id, result) }
        }
        return result.response
    }

    @Operation(summary = "행사 수정")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody req: UpdateEventRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventResponse {
        val result = eventService.updateEvent(user.id, id, req)
        // 커밋 후 팬아웃(행 락 밖) — 상태 변경 알림과 동일 패턴.
        eventService.notifyDetailsUpdated(user.id, id, result)
        return result.response
    }

    @Operation(summary = "정원 증원", description = "모집중 행사에서 늘리기만 허용(개설자 전용). 감원·미정 전환은 불가.")
    @SecurityRequirement(name = "bearerAuth")
    @PatchMapping("/{id}/capacity")
    fun increaseCapacity(
        @PathVariable id: String,
        @RequestBody req: IncreaseCapacityRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventResponse {
        val result = eventService.increaseCapacity(user.id, id, req.capacity)
        eventService.notifyCapacityIncreased(user.id, id, result)
        return result.response
    }

    @Operation(summary = "행사 삭제")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: String, @AuthenticationPrincipal user: AuthUser) =
        eventService.deleteEvent(user.id, id)

    @Operation(summary = "행사 작성")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(@RequestBody req: CreateEventRequest, @AuthenticationPrincipal user: AuthUser): EventResponse =
        eventService.createEvent(user, req)

    @Operation(summary = "행사 참여 후기 조회", description = "공개 API. JWT 가 있으면 소유 여부와 내 인증 여부를 포함한다.")
    @GetMapping("/{eventId}/proofs")
    fun proofs(
        @PathVariable eventId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @AuthenticationPrincipal user: AuthUser?,
    ): EventProofsResponse = proofService.listProofs(eventId, user?.id, page, size)

    @Operation(summary = "행사 참여 후기 작성", description = "참여자만, 모집 시작 이후, 1인 1건.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{eventId}/proofs")
    @ResponseStatus(HttpStatus.CREATED)
    fun addProof(
        @PathVariable eventId: String,
        @RequestBody req: CreateEventProofRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventProofResponse = proofService.createProof(user, eventId, req)

    @Operation(summary = "행사 참여 후기 삭제")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{eventId}/proofs/{proofId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteProof(
        @PathVariable eventId: String,
        @PathVariable proofId: String,
        @AuthenticationPrincipal user: AuthUser,
    ) = proofService.deleteProof(user.id, eventId, proofId)

    @Operation(summary = "행사 댓글 조회", description = "공개 API. JWT 가 있으면 댓글 소유 여부를 포함한다.")
    @GetMapping("/{eventId}/comments")
    fun comments(
        @PathVariable eventId: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal user: AuthUser?,
    ): EventCommentsResponse = commentService.listComments(eventId, user?.id, page, size)

    @Operation(summary = "행사 댓글 위치 조회", description = "특정 댓글이 최신순 pagination 상 몇 번째 page 에 있는지 계산한다.")
    @GetMapping("/{eventId}/comments/{commentId}/page")
    fun commentPageLocation(
        @PathVariable eventId: String,
        @PathVariable commentId: String,
        @RequestParam(defaultValue = "20") size: Int,
    ): CommentPageLocationResponse = commentService.getCommentPageLocation(eventId, commentId, size)

    @Operation(summary = "행사 댓글 작성")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{eventId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    fun addComment(
        @PathVariable eventId: String,
        @RequestBody req: CreateEventCommentRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventCommentResponse = commentService.createComment(user, eventId, req)

    @Operation(summary = "행사 댓글 수정")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{eventId}/comments/{commentId}")
    fun updateComment(
        @PathVariable eventId: String,
        @PathVariable commentId: String,
        @RequestBody req: UpdateEventCommentRequest,
        @AuthenticationPrincipal user: AuthUser,
    ): EventCommentResponse = commentService.updateComment(user.id, eventId, commentId, req)

    @Operation(summary = "행사 댓글 삭제")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{eventId}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteComment(
        @PathVariable eventId: String,
        @PathVariable commentId: String,
        @AuthenticationPrincipal user: AuthUser,
    ) = commentService.deleteComment(user.id, eventId, commentId)
}
