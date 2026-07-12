package com.hanbit.api.praise

import org.springframework.data.jpa.repository.JpaRepository
import java.time.Instant

interface PraiseSetlistRepository : JpaRepository<PraiseSetlist, String>

interface PraiseAssignmentRepository : JpaRepository<PraiseAssignment, String> {
    fun findBySetlistId(setlistId: String): List<PraiseAssignment>
    fun findBySetlistIdIn(setlistIds: Collection<String>): List<PraiseAssignment>
    fun findBySetlistIdAndUserId(setlistId: String, userId: Long): List<PraiseAssignment>
    fun deleteBySetlistId(setlistId: String)
}

interface PraiseScheduleRepository : JpaRepository<PraiseSchedule, String> {
    // 전체(과거 포함) 일정을 DB 정렬로 가져온다 — idx_praise_schedules_start_at 를 탄다.
    fun findAllByOrderByStartAtAsc(): List<PraiseSchedule>
    fun findByStartAtGreaterThanEqualOrderByStartAtAsc(from: Instant): List<PraiseSchedule>
    fun findByVisibilityInAndStartAtGreaterThanEqualOrderByStartAtAsc(
        visibilities: Collection<String>,
        from: Instant,
    ): List<PraiseSchedule>
}
