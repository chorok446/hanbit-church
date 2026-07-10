package com.cheolma.api.praise

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant

/** 일정 종류. REHEARSAL=리허설, PART_PRACTICE=파트 연습, FULL_PRACTICE=전체 연습, WORSHIP=예배 지원, ETC=기타. */
enum class PraiseScheduleType { REHEARSAL, PART_PRACTICE, FULL_PRACTICE, WORSHIP, ETC }

/** 공개 범위. PRIVATE=찬양팀 내부, CHURCH=로그인 교인(교회 캘린더), PUBLIC=외부 공개. */
enum class PraiseScheduleVisibility { PRIVATE, CHURCH, PUBLIC }

/**
 * 찬양팀 일정. 조회 권한은 visibility 에 따라 층이 나뉜다(PraiseScheduleService):
 * 찬양팀 멤버·ADMIN = 전체, 로그인 교인 = CHURCH+PUBLIC, 비로그인 = PUBLIC.
 * 쓰기는 콘티와 동일하게 리더+사이트 ADMIN 전용.
 */
@Entity
@Table(
    name = "praise_schedules",
    indexes = [Index(name = "idx_praise_schedules_start_at", columnList = "start_at")],
)
class PraiseSchedule(
    @Id val id: String,
    @Column(nullable = false, length = 100) var title: String,
    @Column(nullable = false, length = 30) var type: String = PraiseScheduleType.REHEARSAL.name,
    @Column(name = "start_at", nullable = false) var startAt: Instant,
    @Column(name = "end_at") var endAt: Instant? = null,
    @Column(length = 100) var location: String? = null,
    @Column(length = 500) var memo: String? = null,
    @Column(nullable = false, length = 20) var visibility: String = PraiseScheduleVisibility.PRIVATE.name,
    // 연결 콘티(선택). FK 제약 없이 참조만 — 콘티 삭제 시 일정은 남는다(연결만 무효).
    @Column(name = "setlist_id", length = 64) var setlistId: String? = null,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)
