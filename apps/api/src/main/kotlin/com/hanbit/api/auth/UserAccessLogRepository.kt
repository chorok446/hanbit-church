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

    /**
     * 통계(DAU)용 — 기간 내 KST 일별 활성 회원 수(중복 접속은 하루 1명). `[kstEpochDay, dau]` 쌍.
     *
     * KST 일 버킷과 distinct 카운트를 DB단에서 처리한다(과거엔 전 행을 앱으로 끌어와 버킷팅했다).
     * accessed_at(UTC datetime)을 +9h(KST 고정 오프셋) 이동한 뒤 1970-01-01 기준 epoch-day 정수로
     * 환산해 그룹핑한다 — DATE 반환 대신 정수만 돌려 H2/MySQL 간 date·정수 타입 매핑 차이를 피한다.
     * `timestampadd`/`timestampdiff` 와 ANSI timestamp 리터럴은 두 DB 모두 동일하게 동작한다.
     *
     * KST 는 1988년 이후 DST 없는 고정 UTC+9 라 상수 +9h 오프셋이 앱단 `ZoneId("Asia/Seoul")`
     * 계산과 정확히 일치한다(접속 기록은 보존 기간 내 최근치 — 1988년 이전 값은 존재하지 않는다).
     */
    @Query(
        value = """
            select timestampdiff(DAY, timestamp '1970-01-01 00:00:00', timestampadd(HOUR, 9, accessed_at)) as kst_day,
                   count(distinct user_id) as dau
            from user_access_logs
            where accessed_at >= :since
            group by timestampdiff(DAY, timestamp '1970-01-01 00:00:00', timestampadd(HOUR, 9, accessed_at))
        """,
        nativeQuery = true,
    )
    fun dailyActiveUsersSince(
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
