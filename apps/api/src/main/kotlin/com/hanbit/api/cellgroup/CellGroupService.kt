package com.hanbit.api.cellgroup

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.notification.NotificationService
import com.hanbit.api.notification.NotificationType
import org.springframework.data.domain.PageRequest
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.format.DateTimeParseException
import java.util.UUID

/**
 * 소그룹/목장(구역) 서비스. 찬양팀(PraiseService)을 청사진으로 삼되 "여러 그룹" 구조라
 * 권한 판정에 그룹 컨텍스트를 넘긴다(CellGroupAccess).
 * - 그룹·로스터 관리: 사역 스태프(ADMIN/OPERATOR/MINISTRY)
 * - 정보 수정·모임 CRUD·기록: 그룹 리더 또는 스태프
 * - 조회(디렉터리): 로그인 회원 전체(비활성 목장은 매니저만), 상세: 그룹 멤버·리더·스태프
 */
@Service
class CellGroupService(
    private val groups: CellGroupRepository,
    private val members: CellGroupMemberRepository,
    private val meetings: CellGroupMeetingRepository,
    private val users: UserRepository,
    private val access: CellGroupAccess,
    private val notifications: NotificationService,
    private val clock: Clock,
) {
    // ─── 디렉터리·상세 ───

    /** 목장 디렉터리. 매니저는 비활성 포함 전체, 그 외 로그인 회원은 활성 목장만 본다. */
    @Transactional(readOnly = true)
    fun getDirectory(requesterId: Long): List<CellGroupSummaryResponse> {
        val manager = access.isManager(users.findById(requesterId).orElse(null) ?: notFoundUser())
        val rows = if (manager) groups.findAllByOrderByNameAsc() else groups.findByActiveTrueOrderByNameAsc()
        // 멤버 수·본인 소속을 현재 목록 그룹들만 한 번에 집계(전량 로드/ N+1 방지).
        val roster = members.findByCellGroupIdIn(rows.map { it.id })
        val countByGroup = roster.groupingBy { it.cellGroupId }.eachCount()
        val myGroupIds = roster.filter { it.userId == requesterId }.map { it.cellGroupId }.toSet()
        val names = memberNames(rows.mapNotNull { it.leaderUserId })
        return rows.map {
            CellGroupSummaryResponse(
                id = it.id,
                name = it.name,
                district = it.district,
                leaderUserId = it.leaderUserId,
                leaderName = it.leaderUserId?.let { uid -> names[uid] },
                memberCount = countByGroup[it.id] ?: 0,
                active = it.active,
                mine = it.id in myGroupIds || it.leaderUserId == requesterId,
            )
        }
    }

    /** 내가 속한(로스터·리더) 목장 목록. */
    @Transactional(readOnly = true)
    fun getMine(requesterId: Long): List<CellGroupSummaryResponse> {
        val mineIds = members.findByUserId(requesterId).map { it.cellGroupId }.toMutableSet()
        val led = groups.findAllByOrderByNameAsc().filter { it.leaderUserId == requesterId }
        mineIds += led.map { it.id }
        if (mineIds.isEmpty()) return emptyList()
        val rows = groups.findAllById(mineIds).sortedBy { it.name }
        val roster = members.findByCellGroupIdIn(rows.map { it.id })
        val countByGroup = roster.groupingBy { it.cellGroupId }.eachCount()
        val names = memberNames(rows.mapNotNull { it.leaderUserId })
        return rows.map {
            CellGroupSummaryResponse(
                id = it.id,
                name = it.name,
                district = it.district,
                leaderUserId = it.leaderUserId,
                leaderName = it.leaderUserId?.let { uid -> names[uid] },
                memberCount = countByGroup[it.id] ?: 0,
                active = it.active,
                mine = true,
            )
        }
    }

    /** 목장 상세(멤버·리더·매니저). 정보 + 로스터 + 모임(스케줄·기록). */
    @Transactional(readOnly = true)
    fun getGroup(requesterId: Long, id: String): CellGroupDetailResponse {
        val group = findGroup(id)
        val user = access.requireGroupMember(requesterId, group)
        return group.toDetail(requesterId, user)
    }

    // ─── 그룹 CRUD (매니저) ───

    @Transactional
    fun create(requesterId: Long, request: SaveCellGroupRequest): CellGroupDetailResponse {
        val user = access.requireManager(requesterId)
        val now = Instant.now(clock)
        val group = CellGroup(id = "cg-${UUID.randomUUID()}", name = "", createdAt = now, updatedAt = now)
        applyRequest(group, request, isManager = true)
        return groups.save(group).toDetail(requesterId, user)
    }

    @Transactional
    fun update(requesterId: Long, id: String, request: SaveCellGroupRequest): CellGroupDetailResponse {
        val group = findGroup(id)
        val user = access.requireGroupLeader(requesterId, group)
        // 리더 재지정·활성 전환은 매니저만. 리더가 보낸 leaderUserId/active 는 기존 값 유지.
        applyRequest(group, request, isManager = access.isManager(user))
        group.updatedAt = Instant.now(clock)
        return group.toDetail(requesterId, user)
    }

    @Transactional
    fun delete(requesterId: Long, id: String) {
        val group = findGroup(id)
        access.requireManager(requesterId)
        meetings.deleteByCellGroupId(group.id)
        members.deleteByCellGroupId(group.id)
        groups.delete(group)
    }

    // ─── 로스터 (매니저) ───

    /** 로스터 전체 교체. 유지되는 멤버의 joinedAt 은 보존하고, 새로 추가된 멤버에게만 합류 알림. */
    @Transactional
    fun setMembers(requesterId: Long, id: String, request: SetCellGroupMembersRequest): CellGroupDetailResponse {
        val group = findGroup(id)
        val actor = access.requireManager(requesterId)
        if (request.members.size > MAX_MEMBERS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "too many members (max $MAX_MEMBERS)")
        }
        val inputs = request.members.distinctBy { it.userId }
        val roles = inputs.associate { it.userId to parseEnum<CellGroupMemberRole>(it.role) { "invalid role: ${it.role}" }.name }
        val found = users.findAllById(inputs.map { it.userId }).associateBy { it.id }
        inputs.forEach {
            val member = found[it.userId]
            if (member == null || member.deletedAt != null) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "user ${it.userId} not found")
            }
        }

        val now = Instant.now(clock)
        val previous = members.findByCellGroupId(group.id)
        val keptJoinedAt = previous.associate { it.userId to it.joinedAt }
        val previousIds = previous.map { it.userId }.toSet()
        members.deleteByCellGroupId(group.id)
        members.flush() // 같은 (group,user) 재삽입 시 unique 충돌 방지 — delete 를 먼저 반영.
        val replaced = inputs.map {
            CellGroupMember(
                id = "cgm-${UUID.randomUUID()}",
                cellGroupId = group.id,
                userId = it.userId,
                displayName = requireNotNull(found[it.userId]).name,
                roleInGroup = roles.getValue(it.userId),
                joinedAt = keptJoinedAt[it.userId] ?: now,
            )
        }
        members.saveAll(replaced)

        // 새로 추가된 멤버에게만 합류 알림(액터 본인 제외 — notify 규칙).
        inputs.map { it.userId }.filter { it !in previousIds }.forEach { userId ->
            notifications.notify(
                recipientUserId = userId,
                actorUserId = requesterId,
                type = NotificationType.CELL_GROUP_JOINED,
                title = "목장에 등록되었습니다",
                body = "'${group.name}' 목장 명단에 등록되었습니다.",
                href = "/cell-groups/${group.id}",
            )
        }
        return group.toDetail(requesterId, actor)
    }

    /** 로스터 추가 후보 검색(매니저). 공개 노출 대상 회원을 이름으로 부분 검색한다. */
    @Transactional(readOnly = true)
    fun searchCandidates(requesterId: Long, query: String?): List<CellGroupCandidateResponse> {
        access.requireManager(requesterId)
        val q = query?.trim()?.lowercase()?.takeIf { it.isNotEmpty() } ?: return emptyList()
        return users.searchPublic(q, Instant.now(clock), PageRequest.of(0, CANDIDATE_LIMIT))
            .content
            .map { CellGroupCandidateResponse(id = requireNotNull(it.id), name = it.name) }
    }

    // ─── 모임 (리더·매니저) ───

    @Transactional
    fun createMeeting(requesterId: Long, groupId: String, request: SaveCellMeetingRequest): CellMeetingResponse {
        val group = findGroup(groupId)
        access.requireGroupLeader(requesterId, group)
        val now = Instant.now(clock)
        val meeting = CellGroupMeeting(
            id = "cgmt-${UUID.randomUUID()}",
            cellGroupId = group.id,
            title = "",
            meetAt = now,
            createdAt = now,
            updatedAt = now,
        )
        applyMeeting(group, meeting, request)
        return meetings.save(meeting).toResponse()
    }

    @Transactional
    fun updateMeeting(
        requesterId: Long,
        groupId: String,
        meetingId: String,
        request: SaveCellMeetingRequest,
    ): CellMeetingResponse {
        val group = findGroup(groupId)
        access.requireGroupLeader(requesterId, group)
        val meeting = findMeeting(group.id, meetingId)
        applyMeeting(group, meeting, request)
        meeting.updatedAt = Instant.now(clock)
        return meeting.toResponse()
    }

    @Transactional
    fun deleteMeeting(requesterId: Long, groupId: String, meetingId: String) {
        val group = findGroup(groupId)
        access.requireGroupLeader(requesterId, group)
        meetings.delete(findMeeting(group.id, meetingId))
    }

    // ─── 내부 ───

    private fun notFoundUser(): Nothing =
        throw ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden")

    private fun findGroup(id: String): CellGroup =
        groups.findById(id).orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "cell group $id not found") }

    private fun findMeeting(groupId: String, meetingId: String): CellGroupMeeting {
        val meeting = meetings.findById(meetingId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "meeting $meetingId not found")
        }
        if (meeting.cellGroupId != groupId) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "meeting $meetingId not found")
        }
        return meeting
    }

    private fun applyRequest(group: CellGroup, request: SaveCellGroupRequest, isManager: Boolean) {
        val name = request.name.trim()
        if (name.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required")
        if (name.length > MAX_NAME) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "name is too long")
        val district = request.district?.trim()?.ifEmpty { null }
        if (district != null && district.length > MAX_DISTRICT) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "district is too long")
        }
        val description = request.description?.trim()?.ifEmpty { null }
        if (description != null && description.length > MAX_DESCRIPTION) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "description is too long")
        }
        group.name = name
        group.district = district
        group.description = description
        // 리더 지정·활성 전환은 매니저만. 리더가 수정할 때는 이 두 값을 건드리지 않는다.
        if (isManager) {
            val leaderId = request.leaderUserId
            if (leaderId != null) {
                val leader = users.findById(leaderId).orElse(null)
                if (leader == null || leader.deletedAt != null) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "leader user $leaderId not found")
                }
            }
            group.leaderUserId = leaderId
            group.active = request.active
        }
    }

    private fun applyMeeting(group: CellGroup, meeting: CellGroupMeeting, request: SaveCellMeetingRequest) {
        val title = request.title.trim()
        if (title.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required")
        if (title.length > MAX_MEETING_TITLE) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "title is too long")
        val meetAt = try {
            Instant.parse(request.meetAt.trim())
        } catch (_: DateTimeParseException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "meetAt must be an ISO-8601 instant")
        }
        val agenda = request.agenda?.trim()?.ifEmpty { null }
        if (agenda != null && agenda.length > MAX_AGENDA) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "agenda is too long")
        }
        val sharing = request.sharingNote?.trim()?.ifEmpty { null }
        if (sharing != null && sharing.length > MAX_SHARING) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "sharingNote is too long")
        }
        // 참석은 로스터 안에서만. 이름은 로스터 snapshot 을 신뢰한다(모임 시점 명단).
        val roster = members.findByCellGroupId(group.id).associateBy { it.userId }
        val attendance = request.attendance.distinctBy { it.userId }.map {
            val member = roster[it.userId]
                ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "user ${it.userId} is not in this group")
            val status = parseEnum<CellMeetingAttendanceStatus>(it.status) { "invalid status: ${it.status}" }
            CellMeetingAttendance(userId = it.userId, displayName = member.displayName, status = status.name)
        }

        meeting.title = title
        meeting.meetAt = meetAt
        meeting.location = request.location?.trim()?.ifEmpty { null }
        meeting.agenda = agenda
        meeting.sharingNote = sharing
        meeting.attendance = attendance.ifEmpty { null }
    }

    /** user id → 이름 배치 조회(표시용). */
    private fun memberNames(ids: List<Long>): Map<Long, String> {
        val distinct = ids.distinct()
        if (distinct.isEmpty()) return emptyMap()
        return users.findAllById(distinct).associate { requireNotNull(it.id) to it.name }
    }

    private fun CellGroup.toDetail(requesterId: Long, requester: User): CellGroupDetailResponse {
        val roster = members.findByCellGroupId(id)
            .sortedWith(compareBy({ if (it.roleInGroup == CellGroupMemberRole.LEADER.name) 0 else 1 }, { it.displayName }))
        val meetingRows = meetings.findByCellGroupIdOrderByMeetAtDesc(id)
        val manager = access.isManager(requester)
        val canManage = manager || leaderUserId == requesterId
        return CellGroupDetailResponse(
            id = id,
            name = name,
            district = district,
            leaderUserId = leaderUserId,
            leaderName = leaderUserId?.let { memberNames(listOf(it))[it] },
            description = description,
            active = active,
            members = roster.map {
                CellGroupMemberResponse(userId = it.userId, name = it.displayName, role = it.roleInGroup, joinedAt = it.joinedAt.toString())
            },
            meetings = meetingRows.map { it.toResponse() },
            canManage = canManage,
            canManageRoster = manager,
            createdAt = createdAt.toString(),
            updatedAt = updatedAt.toString(),
        )
    }

    private fun CellGroupMeeting.toResponse() = CellMeetingResponse(
        id = id,
        title = title,
        meetAt = meetAt.toString(),
        location = location,
        agenda = agenda,
        sharingNote = sharingNote,
        attendance = attendance.orEmpty().map {
            CellMeetingAttendanceResponse(userId = it.userId, name = it.displayName, status = it.status)
        },
        createdAt = createdAt.toString(),
        updatedAt = updatedAt.toString(),
    )

    private inline fun <reified E : Enum<E>> parseEnum(raw: String, message: () -> String): E =
        runCatching { java.lang.Enum.valueOf(E::class.java, raw.trim()) }.getOrElse {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, message())
        }

    private companion object {
        const val MAX_NAME = 100
        const val MAX_DISTRICT = 60
        const val MAX_DESCRIPTION = 1000
        const val MAX_MEMBERS = 200
        const val MAX_MEETING_TITLE = 100
        const val MAX_AGENDA = 1000
        const val MAX_SHARING = 5000
        const val CANDIDATE_LIMIT = 10
    }
}
