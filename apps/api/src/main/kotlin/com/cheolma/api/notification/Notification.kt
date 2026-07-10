package com.cheolma.api.notification

import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant

/** 알림 타입. 이번 PR 범위. */
object NotificationType {
    const val POST_COMMENT_CREATED = "POST_COMMENT_CREATED"
    const val COMMENT_REPLY_CREATED = "COMMENT_REPLY_CREATED"
    const val COMMENT_MENTIONED = "COMMENT_MENTIONED"
    const val EVENT_COMMENT_CREATED = "EVENT_COMMENT_CREATED"
    const val EVENT_JOINED = "EVENT_JOINED"
    const val EVENT_PROOF_CREATED = "EVENT_PROOF_CREATED"
    const val EVENT_PARTICIPATION_REMOVED = "EVENT_PARTICIPATION_REMOVED"
    const val POST_LIKED = "POST_LIKED"
    const val EVENT_STATUS_CHANGED = "EVENT_STATUS_CHANGED"
    const val EVENT_RECRUIT_ENDING = "EVENT_RECRUIT_ENDING"
    const val REPORT_RESOLVED = "REPORT_RESOLVED"
    const val CONTENT_HIDDEN = "CONTENT_HIDDEN"
    const val CONTENT_RESTORED = "CONTENT_RESTORED"

    // 찬양팀 — 리더가 콘티 파트 배정을 저장할 때(PraiseService.setAssignments).
    const val PRAISE_ASSIGNED = "PRAISE_ASSIGNED"
    const val PRAISE_UNASSIGNED = "PRAISE_UNASSIGNED"
    // 리더가 미응답자에게 참석 리마인드를 보낼 때(PraiseService.remindPendingAttendance).
    const val PRAISE_ATTENDANCE_REMINDER = "PRAISE_ATTENDANCE_REMINDER"
    // 일정 시각·장소가 바뀔 때 연결 콘티 배정자에게(PraiseScheduleService.update).
    const val PRAISE_SCHEDULE_CHANGED = "PRAISE_SCHEDULE_CHANGED"

    // 보안 — 이전 접속 기록에 없는 (IP, 브라우저) 조합으로 로그인했을 때(AccessLogService.record).
    const val NEW_DEVICE_LOGIN = "NEW_DEVICE_LOGIN"
}

/**
 * 사용자별 알림. userId 는 수신자이며 응답에 노출하지 않는다(@JsonIgnore).
 * 정렬은 seq DESC, id ASC. readAt == null 이면 unread.
 */
@Entity
@Table(
    name = "notifications",
    indexes = [
        Index(name = "idx_notifications_user_read_seq", columnList = "user_id, read_at, seq"),
        Index(name = "idx_notifications_user_seq", columnList = "user_id, seq"),
    ],
)
class Notification(
    @Id val id: String,
    @Column(name = "user_id", nullable = false) @JsonIgnore val userId: Long,
    @Column(nullable = false) val type: String,
    @Column(nullable = false) val title: String,
    @Column(nullable = false, columnDefinition = "TEXT") val body: String,
    @Column(nullable = false) val href: String,
    @Column(name = "read_at") var readAt: Instant?,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    // 작성 시점 표시 스냅샷. 프론트는 createdAt 으로 상대시간을 만들고 이 값은 fallback.
    @Column(nullable = false) val time: String,
    @JsonIgnore val seq: Long,
)
