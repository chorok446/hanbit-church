package com.hanbit.api.cellgroup

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

/** 그룹 내 역할. LEADER=구역장·부구역장, MEMBER=일반 목장원. 그룹의 대표 리더는 CellGroup.leaderUserId 로도 표시된다. */
enum class CellGroupMemberRole { LEADER, MEMBER }

/** 모임 참석 응답. PRESENT=참석, ABSENT=결석, EXCUSED=사유결석. */
enum class CellMeetingAttendanceStatus { PRESENT, ABSENT, EXCUSED }

/**
 * 소그룹/목장(구역). 찬양팀(praise)과 달리 "여러 그룹"이므로 그룹별 리더·로스터를 둔다.
 * 접근 권한은 CellGroupService/CellGroupAccess 가 판정한다(SecurityConfig 는 인증만 요구):
 * - 그룹·로스터 관리: 사역 스태프(ADMIN/OPERATOR/MINISTRY)
 * - 정보 수정·모임/기록: 그룹 리더(leaderUserId) 또는 스태프
 * - 조회: 그룹 멤버·리더·스태프
 */
@Entity
@Table(
    name = "cell_groups",
    indexes = [Index(name = "idx_cell_groups_active_name", columnList = "active, name")],
)
class CellGroup(
    @Id val id: String,
    @Column(nullable = false, length = 100) var name: String,
    @Column(length = 60) var district: String? = null,
    // 목장을 인도하는 리더. 참조만(FK 제약 없음) — 권한 판단은 매 요청 이 값·roster 로 한다.
    @Column(name = "leader_user_id") var leaderUserId: Long? = null,
    @Column(length = 1000) var description: String? = null,
    @Column(nullable = false) var active: Boolean = true,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)

/**
 * 목장 로스터 한 줄. (cellGroupId, userId) 중복 방지·본인 소속 조회가 필요해 별도 테이블.
 * 이름은 배정 당시 snapshot 으로 저장한다(표시는 이 값).
 */
@Entity
@Table(
    name = "cell_group_members",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_cell_group_member", columnNames = ["cell_group_id", "user_id"]),
    ],
    indexes = [Index(name = "idx_cell_group_members_user", columnList = "user_id")],
)
class CellGroupMember(
    @Id val id: String,
    @Column(name = "cell_group_id", nullable = false, length = 64) val cellGroupId: String,
    @Column(name = "user_id", nullable = false) val userId: Long,
    @Column(name = "display_name", nullable = false, length = 60) var displayName: String,
    @Column(name = "role_in_group", nullable = false, length = 20)
    var roleInGroup: String = CellGroupMemberRole.MEMBER.name,
    @Column(name = "joined_at", nullable = false) var joinedAt: Instant,
)

/** 모임의 참석 기록 한 줄(JSON 문서). */
data class CellMeetingAttendance(
    val userId: Long = 0,
    val displayName: String = "",
    /** CellMeetingAttendanceStatus 이름. */
    val status: String = CellMeetingAttendanceStatus.PRESENT.name,
)

/**
 * 목장 모임(스케줄 + 기록). 스케줄(meetAt·장소·주제)과 모임 후 기록(참석·나눔)을 한 엔티티에 담는다 —
 * 참석은 그룹 규모(수~수십)라 별도 테이블 없이 JSON 문서로 충분하다(콘티 곡/공지 저장 패턴 재사용).
 */
@Entity
@Table(
    name = "cell_group_meetings",
    indexes = [Index(name = "idx_cell_group_meetings_group_meet_at", columnList = "cell_group_id, meet_at")],
)
class CellGroupMeeting(
    @Id val id: String,
    @Column(name = "cell_group_id", nullable = false, length = 64) val cellGroupId: String,
    @Column(nullable = false, length = 100) var title: String,
    @Column(name = "meet_at", nullable = false) var meetAt: Instant,
    @Column(length = 100) var location: String? = null,
    @Column(length = 1000) var agenda: String? = null,
    @Column(name = "sharing_note", columnDefinition = "TEXT") var sharingNote: String? = null,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json")
    var attendance: List<CellMeetingAttendance>? = null,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)
