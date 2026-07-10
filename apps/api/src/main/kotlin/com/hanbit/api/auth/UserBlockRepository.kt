package com.hanbit.api.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface UserBlockRepository : JpaRepository<UserBlock, String> {
    fun existsByBlockerIdAndBlockedId(blockerId: Long, blockedId: Long): Boolean

    /** viewer 가 차단한 대상 bulk 조회 — 사용자별 exists N+1 방지(목록 매핑용). */
    @Query("select b.blockedId from UserBlock b where b.blockerId = :blockerId and b.blockedId in :userIds")
    fun findBlockedIdsAmong(@Param("blockerId") blockerId: Long, @Param("userIds") userIds: Collection<Long>): List<Long>

    fun deleteByBlockerIdAndBlockedId(blockerId: Long, blockedId: Long): Long

    @Query(
        """
        select case when count(b) > 0 then true else false end
        from UserBlock b
        where (b.blockerId = :a and b.blockedId = :b)
           or (b.blockerId = :b and b.blockedId = :a)
        """,
    )
    fun isBlockedEitherWay(@Param("a") a: Long, @Param("b") b: Long): Boolean

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from UserBlock b where b.blockerId = :userId or b.blockedId = :userId")
    fun deleteAllForUser(@Param("userId") userId: Long)
}
