package com.hanbit.api.auth

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import java.time.Instant

interface UserAccessLogRepository : JpaRepository<UserAccessLog, Long> {
    fun findByUserIdAndAccessedAtAfterOrderByAccessedAtDesc(
        userId: Long,
        accessedAt: Instant,
        pageable: Pageable,
    ): Page<UserAccessLog>

    // 새 기기 로그인 감지 — 첫 로그인 여부 / 같은 (IP, 브라우저) 접속 이력 존재 여부.
    fun existsByUserId(userId: Long): Boolean
    fun existsByUserIdAndSessionId(userId: Long, sessionId: String): Boolean

    /** 통계(DAU)용 — 기간 내 (userId, accessedAt) 쌍. 일 버킷·distinct 는 서비스에서 처리한다. */
    @org.springframework.data.jpa.repository.Query(
        "select l.userId, l.accessedAt from UserAccessLog l where l.accessedAt >= :since",
    )
    fun findUserAccessSince(
        @org.springframework.data.repository.query.Param("since") since: Instant,
    ): List<Array<Any>>

    @org.springframework.data.jpa.repository.Query(
        "select distinct l.sessionId from UserAccessLog l " +
            "where l.userId = :userId and l.sessionId is not null and l.accessedAt > :since",
    )
    fun findDistinctSessionIdsSince(
        @org.springframework.data.repository.query.Param("userId") userId: Long,
        @org.springframework.data.repository.query.Param("since") since: Instant,
    ): List<String>
    fun existsByUserIdAndIpAddressAndBrowser(userId: Long, ipAddress: String, browser: String): Boolean

    @Modifying
    fun deleteByUserId(userId: Long)

    @Modifying
    @Query("DELETE FROM UserAccessLog l WHERE l.accessedAt < :before")
    fun deleteByAccessedAtBefore(before: Instant): Int
}
