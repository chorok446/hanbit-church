package com.cheolma.api.praise

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

/**
 * 콘티의 파트 배정 한 줄. 곡(JSON)과 달리 별도 테이블 —
 * 본인 참석 변경(user_id 매칭)과 (setlist, user, part) 중복 방지가 필요하다.
 */
@Entity
@Table(
    name = "praise_assignments",
    uniqueConstraints = [
        UniqueConstraint(name = "uq_praise_assignment", columnNames = ["setlist_id", "user_id", "part"]),
    ],
    indexes = [Index(name = "idx_praise_assignments_user", columnList = "user_id")],
)
class PraiseAssignment(
    @Id val id: String,
    @Column(name = "setlist_id", nullable = false, length = 64) val setlistId: String,
    @Column(name = "user_id", nullable = false) val userId: Long,
    // 배정 당시 이름 snapshot. 표시는 이 값 — 조회 때마다 users 조인하지 않는다.
    @Column(name = "display_name", nullable = false, length = 60) var displayName: String,
    // PraisePart 이름 (예: "VOCAL").
    @Column(nullable = false, length = 30) val part: String,
    @Column(name = "attendance_status", nullable = false, length = 20)
    var attendanceStatus: String = PraiseAttendanceStatus.PENDING.name,
    @Column(length = 500) var memo: String? = null,
)
