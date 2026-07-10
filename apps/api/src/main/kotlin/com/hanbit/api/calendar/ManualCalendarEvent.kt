package com.hanbit.api.calendar

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

/**
 * 관리자가 직접 등록하는 수동 교회 일정(절기 행사·심방·새가족 환영회 등).
 * 행사(Event)와 달리 모집·참여 개념이 없는 표시 전용 일정이다.
 * 프론트 캘린더의 ManualCalendarEvent(apps/web/src/data/calendar.ts)와 1:1 대응.
 */
@Entity
@Table(
    name = "manual_calendar_events",
    indexes = [Index(name = "idx_manual_calendar_start_date", columnList = "start_date")],
)
class ManualCalendarEvent(
    @Id val id: String,
    @Column(nullable = false, length = 100) var title: String,
    // 프론트 CalendarEventType 부분집합(MANUAL_CALENDAR_TYPES 참조). 파생 타입(deadline/holiday)·찬양팀은 제외.
    @Column(nullable = false, length = 20) var type: String,
    // 행사(Event)와 같은 저장 규칙 — yyyy-MM-dd ISO 문자열.
    @Column(name = "start_date", nullable = false, length = 10) var startDate: String,
    // 여러 날 이어지는 일정만 가진다. null = 하루 일정.
    @Column(name = "end_date", length = 10) var endDate: String? = null,
    // 표시용 시각 문자열(예: "오전 11:00"). 종일 일정이면 null.
    @Column(name = "start_time", length = 20) var startTime: String? = null,
    @Column(length = 100) var location: String? = null,
    // 작성 관리자 표시 이름 snapshot.
    @Column(name = "created_by", nullable = false, length = 50) val createdBy: String,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
)

/** 수동 일정에서 고를 수 있는 타입 — 파생 타입(deadline/holiday)과 찬양팀(별도 도메인)은 제외. */
val MANUAL_CALENDAR_TYPES = setOf("worship", "event", "new-family", "service", "prayer", "etc")

interface ManualCalendarEventRepository : JpaRepository<ManualCalendarEvent, String> {
    fun findAllByOrderByStartDateAscIdAsc(): List<ManualCalendarEvent>

    /** [from, to] 와 겹치는 일정. endDate 없는 하루 일정은 startDate 로 판정한다. */
    @Query(
        "select e from ManualCalendarEvent e " +
            "where e.startDate <= :to and coalesce(e.endDate, e.startDate) >= :from " +
            "order by e.startDate asc, e.id asc",
    )
    fun findOverlapping(@Param("from") from: String, @Param("to") to: String): List<ManualCalendarEvent>
}
