package com.dasida.api.praise

import com.dasida.api.auth.PraisePart
import com.dasida.api.auth.PraiseRole
import com.dasida.api.auth.UserRepository
import com.dasida.api.common.checkPageParams
import com.dasida.api.media.MediaUploadService
import com.dasida.api.media.PraiseFileContent
import com.dasida.api.notification.NotificationService
import com.dasida.api.notification.NotificationType
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import java.util.UUID

/** 알림 본문용 파트 한글 라벨 — 프론트 PRAISE_PART_LABELS 와 1:1. */
internal val PRAISE_PART_LABELS_KO: Map<String, String> = mapOf(
    PraisePart.LEADER.name to "인도",
    PraisePart.VOCAL.name to "싱어",
    PraisePart.KEYBOARD.name to "건반",
    PraisePart.ELECTRIC_GUITAR.name to "일렉 기타",
    PraisePart.ACOUSTIC_GUITAR.name to "어쿠스틱 기타",
    PraisePart.BASS.name to "베이스",
    PraisePart.DRUMS.name to "드럼",
    PraisePart.SOUND.name to "음향",
    PraisePart.MEDIA.name to "영상",
    PraisePart.LYRICS.name to "자막",
)

internal fun praisePartLabelKo(part: String): String = PRAISE_PART_LABELS_KO[part] ?: part

/**
 * 찬양팀 콘티·배정·참석 서비스.
 *
 * 권한은 SecurityConfig 경로 매처가 아니라 여기서 검사한다 — JwtAuthFilter 는
 * 사이트 role(ROLE_ADMIN 등)만 authority 로 부여하고 praiseRole 은 부여하지 않으므로,
 * 매 요청 users.praise_role 을 조회해 판정한다(권한 회수 즉시 반영, JWT 재발급 불필요).
 * - 조회: 찬양팀 역할 보유자(LEADER/MEMBER/GUEST) + 사이트 ADMIN
 * - 쓰기(콘티 CRUD·배정): 찬양팀 LEADER + 사이트 ADMIN
 * - 본인 참석 변경: 본인 user_id 로 배정된 줄만
 */
@Service
class PraiseService(
    private val setlists: PraiseSetlistRepository,
    private val assignments: PraiseAssignmentRepository,
    private val users: UserRepository,
    private val access: PraiseAccess,
    private val notifications: NotificationService,
    private val uploads: MediaUploadService,
    // 업로드 응답 URL 의 절대 base. 파일 자체는 /api/praise/files/{name} 인증 엔드포인트가 서빙한다.
    @param:org.springframework.beans.factory.annotation.Value("\${app.upload.public-base-url:http://localhost:8080}")
    private val publicBaseUrl: String,
    private val clock: Clock,
) {
    // ─── 조회 ───

    @Transactional(readOnly = true)
    fun getSetlists(requesterId: Long, page: Int, size: Int): PraiseSetlistPageResponse {
        access.requireMember(requesterId)
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val pageable = PageRequest.of(
            page,
            size,
            Sort.by(Sort.Order.desc("worshipDate"), Sort.Order.desc("createdAt"), Sort.Order.asc("id")),
        )
        val result = setlists.findAll(pageable)
        // 배정 인원수는 현재 페이지 콘티들만 집계한다(전량 로드 방지).
        val counts = assignments.findBySetlistIdIn(result.content.map { it.id })
            .groupingBy { it.setlistId }
            .eachCount()
        return PraiseSetlistPageResponse(
            content = result.content.map { it.toSummary(counts[it.id] ?: 0) },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    @Transactional(readOnly = true)
    fun getSetlist(requesterId: Long, id: String): PraiseSetlistResponse {
        access.requireMember(requesterId)
        return findSetlist(id).toResponse()
    }

    @Transactional(readOnly = true)
    fun getMembers(requesterId: Long): List<PraiseMemberResponse> {
        access.requireMember(requesterId)
        return users.findByPraiseRoleIsNotNullAndDeletedAtIsNull().map { member ->
            PraiseMemberResponse(
                id = requireNotNull(member.id),
                name = member.name,
                praiseRole = requireNotNull(member.praiseRole),
                praiseParts = member.praiseParts.orEmpty(),
            )
        }.sortedWith(compareBy({ PraiseRole.valueOf(it.praiseRole).ordinal }, { it.name }))
    }

    // ─── 콘티 CRUD (리더·사이트 ADMIN) ───

    @Transactional
    fun create(requesterId: Long, request: SavePraiseSetlistRequest): PraiseSetlistResponse {
        access.requireLeader(requesterId)
        val now = Instant.now(clock)
        val setlist = PraiseSetlist(
            id = "ps-${UUID.randomUUID()}",
            title = "",
            worshipDate = LocalDate.now(clock),
            worshipType = "",
            leaderUserId = requesterId,
            createdAt = now,
            updatedAt = now,
        )
        applyRequest(setlist, request)
        return setlists.save(setlist).toResponse()
    }

    @Transactional
    fun update(requesterId: Long, id: String, request: SavePraiseSetlistRequest): PraiseSetlistResponse {
        val setlist = findSetlist(id)
        // 작성자 본인 또는 관리자만 수정 가능(다른 리더가 남의 콘티를 손대는 것 차단).
        access.requireOwnerOrAdmin(requesterId, setlist.leaderUserId)
        applyRequest(setlist, request)
        setlist.updatedAt = Instant.now(clock)
        return setlist.toResponse()
    }

    @Transactional
    fun delete(requesterId: Long, id: String) {
        val setlist = findSetlist(id)
        access.requireOwnerOrAdmin(requesterId, setlist.leaderUserId)
        assignments.deleteBySetlistId(setlist.id)
        setlists.delete(setlist)
    }

    // ─── 배정 (리더·사이트 ADMIN) ───

    /** 배정 전체 교체. 유지되는 (userId, part) 조합의 참석 응답·메모는 보존한다. */
    @Transactional
    fun setAssignments(requesterId: Long, id: String, request: SavePraiseAssignmentsRequest): PraiseSetlistResponse {
        val setlist = findSetlist(id)
        access.requireOwnerOrAdmin(requesterId, setlist.leaderUserId)
        if (request.assignments.size > MAX_ASSIGNMENTS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "too many assignments (max $MAX_ASSIGNMENTS)")
        }
        val inputs = request.assignments.map { input ->
            val part = parseEnum<PraisePart>(input.part) {
                "invalid part: ${input.part}"
            }
            input.userId to part.name
        }.distinct()

        val members = users.findAllById(inputs.map { it.first }.distinct()).associateBy { it.id }
        inputs.forEach { (userId, _) ->
            val member = members[userId]
            if (member == null || member.deletedAt != null) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "user $userId not found")
            }
            if (member.praiseRole == null) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "user $userId is not a praise team member")
            }
        }

        val previousRows = assignments.findBySetlistId(setlist.id)
        val existing = previousRows.associateBy { it.userId to it.part }
        assignments.deleteBySetlistId(setlist.id)
        assignments.flush() // 같은 (setlist,user,part) 재배정 시 unique 충돌 방지 — delete 를 먼저 반영한다.
        val replaced = inputs.map { (userId, part) ->
            val kept = existing[userId to part]
            PraiseAssignment(
                id = "pa-${UUID.randomUUID()}",
                setlistId = setlist.id,
                userId = userId,
                displayName = requireNotNull(members[userId]).name,
                part = part,
                attendanceStatus = kept?.attendanceStatus ?: PraiseAttendanceStatus.PENDING.name,
                memo = kept?.memo,
            )
        }
        assignments.saveAll(replaced)
        notifyAssignmentChanges(setlist, previousRows, replaced, actorUserId = requesterId)
        return setlist.toResponse(replaced)
    }

    /**
     * 배정 변화 알림. 파트 목록이 달라진(새 배정·파트 변경) 팀원에게 배정 알림을,
     * 배정이 완전히 사라진 팀원에게 해제 알림을 보낸다. 배정을 저장한 리더 본인은 제외(notify 규칙).
     */
    private fun notifyAssignmentChanges(
        setlist: PraiseSetlist,
        previous: List<PraiseAssignment>,
        current: List<PraiseAssignment>,
        actorUserId: Long,
    ) {
        val href = "/praise-team/setlists/${setlist.id}"
        val subtitle = "${setlist.worshipDate} ${setlist.worshipType}"
        val previousParts = previous.groupBy({ it.userId }, { it.part })
        val currentParts = current.groupBy({ it.userId }, { it.part })

        currentParts.forEach { (userId, parts) ->
            if (previousParts[userId]?.toSet() == parts.toSet()) return@forEach
            notifications.notify(
                recipientUserId = userId,
                actorUserId = actorUserId,
                type = NotificationType.PRAISE_ASSIGNED,
                title = "찬양팀 콘티에 배정되었습니다",
                body = "$subtitle — ${parts.joinToString(", ") { praisePartLabelKo(it) }} 파트로 배정되었습니다.",
                href = href,
            )
        }
        previousParts.keys.filter { it !in currentParts }.forEach { userId ->
            notifications.notify(
                recipientUserId = userId,
                actorUserId = actorUserId,
                type = NotificationType.PRAISE_UNASSIGNED,
                title = "찬양팀 콘티 배정이 해제되었습니다",
                body = "$subtitle 콘티의 배정이 해제되었습니다.",
                href = href,
            )
        }
    }

    // ─── 본인 참석 (멤버) ───

    /** 본인 배정의 참석 응답 변경. 여러 파트로 배정돼 있으면 모두 같은 응답으로 갱신한다. */
    @Transactional
    fun updateMyAttendance(requesterId: Long, id: String, request: UpdateMyAttendanceRequest): List<PraiseAssignmentResponse> {
        access.requireMember(requesterId)
        val setlist = findSetlist(id)
        val status = parseEnum<PraiseAttendanceStatus>(request.status) {
            "status must be one of ${PraiseAttendanceStatus.entries.joinToString("/")}"
        }
        val memo = request.memo?.trim()?.ifEmpty { null }
        if (memo != null && memo.length > MAX_MEMO) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "memo must not exceed $MAX_MEMO characters")
        }
        val mine = assignments.findBySetlistIdAndUserId(setlist.id, requesterId)
        if (mine.isEmpty()) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "no assignment for current user in this setlist")
        }
        mine.forEach {
            it.attendanceStatus = status.name
            it.memo = memo
        }
        return mine.map { it.toResponse() }
    }

    // ─── 파일 업로드·서빙 (업로드=리더, 조회=멤버) ───

    /**
     * 악보 사진·PDF 업로드(리더 전용). MediaUploadService 가 전용 디렉터리(praise/)에 저장하고
     * 파일명만 돌려주며, 반환 URL 은 인증 서빙 엔드포인트(/api/praise/files/{name})를 가리킨다.
     * 공개 /uploads 정적 핸들러와 경로가 겹치지 않아 URL 을 알아도 비멤버는 접근할 수 없다.
     */
    fun uploadFile(requesterId: Long, file: MultipartFile): PraiseFileResponse {
        access.requireLeader(requesterId)
        val stored = uploads.storeImageOrPdf(file)
        val base = publicBaseUrl.trim().trimEnd('/')
        return PraiseFileResponse(
            url = "$base/api/praise/files/${stored.filename}",
            kind = stored.kind,
            name = file.originalFilename?.trim()?.takeIf { it.isNotEmpty() } ?: "파일",
        )
    }

    /** 찬양팀 파일 인증 서빙(멤버·ADMIN). 파일명 검증·경로 탐색 방지는 MediaUploadService.readPraiseFile 가 담당. */
    fun readFile(requesterId: Long, filename: String): PraiseFileContent {
        access.requireMember(requesterId)
        return uploads.readPraiseFile(filename)
    }

    // ─── 참석 리마인드 (리더·사이트 ADMIN) ───

    /**
     * 미응답(PENDING) 배정 멤버에게 참석 체크 리마인드 알림을 보낸다.
     * 같은 사용자가 여러 파트로 배정돼도 1건만 보낸다. 리더 본인은 notify 규칙상 제외.
     */
    @Transactional
    fun remindPendingAttendance(requesterId: Long, id: String): PraiseRemindResponse {
        val setlist = findSetlist(id)
        access.requireOwnerOrAdmin(requesterId, setlist.leaderUserId)
        val href = "/praise-team/setlists/${setlist.id}#attendance"
        val subtitle = "${setlist.worshipDate} ${setlist.worshipType}"
        val pendingUserIds = assignments.findBySetlistId(setlist.id)
            .filter { it.attendanceStatus == PraiseAttendanceStatus.PENDING.name }
            .map { it.userId }
            .distinct()
        var sent = 0
        pendingUserIds.forEach { userId ->
            // actor==recipient(리더 본인이 미응답) 인 경우는 notify 가 걸러 실제 발송만 센다.
            if (userId != requesterId) {
                notifications.notify(
                    recipientUserId = userId,
                    actorUserId = requesterId,
                    type = NotificationType.PRAISE_ATTENDANCE_REMINDER,
                    title = "참석 여부를 알려주세요",
                    body = "$subtitle 콘티의 참석 체크가 아직 완료되지 않았습니다. 참석·지각·불참을 표시해 주세요.",
                    href = href,
                )
                sent++
            }
        }
        return PraiseRemindResponse(remindedCount = sent, pendingCount = pendingUserIds.size)
    }

    // ─── 곡 라이브러리 (멤버·사이트 ADMIN) ───

    /**
     * 과거 콘티들의 곡을 곡명 기준으로 distinct 집계한다. 별도 곡 마스터 테이블 없이
     * setlists.songs(JSON)를 메모리에서 집계한다 — 교회 규모(콘티 수십~수백 건)에선 충분하다.
     * 곡명 정규화(trim+소문자)로 묶고, 각 곡의 최근 사용 콘티(worshipDate 최신) 값을 대표로 쓴다.
     */
    @Transactional(readOnly = true)
    fun getSongLibrary(requesterId: Long, query: String?): List<PraiseSongLibraryEntry> {
        access.requireMember(requesterId)
        val keyword = query?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }
        data class Acc(var latest: LocalDate, var key: String, var bpm: Int, var type: String, var count: Int)
        val byTitle = LinkedHashMap<String, Pair<String, Acc>>() // normalized -> (표시용 원제목, 누적)
        setlists.findAll()
            .sortedBy { it.worshipDate } // 오래된 것부터 → 뒤에 오는 최신이 대표값을 덮어쓴다.
            .forEach { setlist ->
                setlist.songs.forEach { song ->
                    val title = song.title.trim()
                    if (title.isEmpty()) return@forEach
                    val norm = title.lowercase()
                    val existing = byTitle[norm]
                    if (existing == null) {
                        byTitle[norm] = title to Acc(setlist.worshipDate, song.key, song.bpm, song.type, 1)
                    } else {
                        val acc = existing.second
                        acc.count++
                        if (!setlist.worshipDate.isBefore(acc.latest)) {
                            acc.latest = setlist.worshipDate
                            acc.key = song.key
                            acc.bpm = song.bpm
                            acc.type = song.type
                        }
                    }
                }
            }
        return byTitle.values
            .filter { keyword == null || it.first.lowercase().contains(keyword) }
            .map { (title, acc) ->
                PraiseSongLibraryEntry(
                    title = title,
                    key = acc.key,
                    bpm = acc.bpm,
                    type = acc.type,
                    useCount = acc.count,
                    lastUsedDate = acc.latest.toString(),
                )
            }
            .sortedWith(compareByDescending<PraiseSongLibraryEntry> { it.useCount }.thenByDescending { it.lastUsedDate })
    }

    // ─── 내부 ───

    private fun findSetlist(id: String): PraiseSetlist =
        setlists.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "setlist $id not found")
        }

    /** 생성·수정 공통 검증/적용. 곡·공지는 전체 교체. */
    private fun applyRequest(setlist: PraiseSetlist, request: SavePraiseSetlistRequest) {
        val title = request.title.trim()
        if (title.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required")
        if (title.length > MAX_TITLE) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is too long")
        val worshipType = request.worshipType.trim()
        if (worshipType.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "worshipType is required")
        if (worshipType.length > MAX_WORSHIP_TYPE) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "worshipType is too long")
        }
        val worshipDate = try {
            LocalDate.parse(request.worshipDate)
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "worshipDate must be yyyy-MM-dd")
        }
        val status = parseEnum<PraiseSetlistStatus>(request.status) {
            "status must be one of ${PraiseSetlistStatus.entries.joinToString("/")}"
        }
        if (request.songs.size > MAX_SONGS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "too many songs (max $MAX_SONGS)")
        }
        if (request.notices.size > MAX_NOTICES) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "too many notices (max $MAX_NOTICES)")
        }
        val songs = request.songs.mapIndexed { index, song ->
            if (song.title.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "song title is required (song ${index + 1})")
            }
            if (song.type !in SONG_TYPES) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "song type must be worship/praise")
            }
            // 순서는 배열 순서를 신뢰해 서버에서 다시 채번한다(클라이언트 재정렬 후 order 불일치 방지).
            song.copy(
                id = song.id.ifBlank { "song-${UUID.randomUUID()}" },
                order = index + 1,
                title = song.title.trim(),
                key = song.key.trim(),
            )
        }
        val notices = request.notices.map { notice ->
            if (notice.title.isBlank()) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "notice title is required")
            }
            notice.copy(id = notice.id.ifBlank { "notice-${UUID.randomUUID()}" }, title = notice.title.trim())
        }

        setlist.title = title
        setlist.worshipDate = worshipDate
        setlist.worshipType = worshipType
        setlist.rehearsalTime = request.rehearsalTime?.trim()?.ifEmpty { null }
        setlist.serviceTime = request.serviceTime?.trim()?.ifEmpty { null }
        setlist.location = request.location?.trim()?.ifEmpty { null }
        setlist.status = status.name
        setlist.songs = songs
        setlist.notices = notices
    }

    private inline fun <reified E : Enum<E>> parseEnum(raw: String, message: () -> String): E =
        runCatching { java.lang.Enum.valueOf(E::class.java, raw.trim()) }.getOrElse {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, message())
        }

    private fun PraiseSetlist.toResponse(
        assignmentRows: List<PraiseAssignment> = assignments.findBySetlistId(id),
    ) = PraiseSetlistResponse(
        id = id,
        title = title,
        worshipDate = worshipDate.toString(),
        worshipType = worshipType,
        rehearsalTime = rehearsalTime,
        serviceTime = serviceTime,
        location = location,
        leaderUserId = leaderUserId,
        status = status,
        songs = songs.sortedBy { it.order },
        notices = notices.orEmpty().sortedWith(compareByDescending<PraiseNoticeItem> { it.pinned }.thenByDescending { it.date }),
        assignments = assignmentRows.sortedWith(
            compareBy({ runCatching { PraisePart.valueOf(it.part).ordinal }.getOrDefault(Int.MAX_VALUE) }, { it.displayName }),
        ).map { it.toResponse() },
        createdAt = createdAt.toString(),
        updatedAt = updatedAt.toString(),
    )

    private fun PraiseSetlist.toSummary(assignmentCount: Int) = PraiseSetlistSummaryResponse(
        id = id,
        title = title,
        worshipDate = worshipDate.toString(),
        worshipType = worshipType,
        serviceTime = serviceTime,
        location = location,
        status = status,
        songCount = songs.size,
        assignmentCount = assignmentCount,
        createdAt = createdAt.toString(),
    )

    private fun PraiseAssignment.toResponse() = PraiseAssignmentResponse(
        id = id,
        userId = userId,
        name = displayName,
        part = part,
        status = attendanceStatus,
        memo = memo,
    )

    private companion object {
        const val MAX_TITLE = 100
        const val MAX_WORSHIP_TYPE = 50
        const val MAX_SONGS = 30
        const val MAX_NOTICES = 20
        const val MAX_ASSIGNMENTS = 50
        const val MAX_MEMO = 500
        const val MAX_PAGE_SIZE = 100
        val SONG_TYPES = setOf("worship", "praise")
    }
}
