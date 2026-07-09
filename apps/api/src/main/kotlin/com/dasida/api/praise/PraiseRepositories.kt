package com.dasida.api.praise

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
    fun findByStartAtGreaterThanEqualOrderByStartAtAsc(from: Instant): List<PraiseSchedule>
    fun findByVisibilityInAndStartAtGreaterThanEqualOrderByStartAtAsc(
        visibilities: Collection<String>,
        from: Instant,
    ): List<PraiseSchedule>
}
