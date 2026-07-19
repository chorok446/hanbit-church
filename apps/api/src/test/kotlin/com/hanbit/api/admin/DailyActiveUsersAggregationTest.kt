package com.hanbit.api.admin

import com.hanbit.api.auth.UserAccessLog
import com.hanbit.api.auth.UserAccessLogRepository
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * DAU DB단 집계(`dailyActiveUsersSince`)가 기존 앱단 distinct+버킷팅과 100% 동일한지 검증한다.
 * 시드/타 테스트 접속 기록과 겹치지 않도록 먼 미래(2035, KST 고정 UTC+9) 창을 쓴다.
 */
@SpringBootTest
@Transactional
class DailyActiveUsersAggregationTest(
    @param:Autowired private val accessLogs: UserAccessLogRepository,
) {
    private val kst = ZoneId.of("Asia/Seoul")

    private fun log(userId: Long, at: Instant) =
        UserAccessLog(userId = userId, ipAddress = "10.0.0.$userId", os = "test", accessedAt = at)

    /** 기존 앱단 구현 그대로 — 같은 행 집합에 대한 기대값(parity 기준). */
    private fun appSideExpected(rows: List<UserAccessLog>): Map<LocalDate, Long> =
        rows.map { it.userId to it.accessedAt.atZone(kst).toLocalDate() }
            .distinct()
            .groupingBy { it.second }
            .eachCount()
            .mapValues { it.value.toLong() }

    private fun dbResult(since: Instant): Map<LocalDate, Long> =
        accessLogs.dailyActiveUsersSince(since)
            .associate { row -> LocalDate.ofEpochDay((row[0] as Number).toLong()) to (row[1] as Number).toLong() }

    @Test
    fun `KST 자정 경계·중복 접속·다일 분포에서 DB 집계가 앱단과 동일하다`() {
        // 2035-06-10 14:59:59Z = KST 06-10 23:59:59 (자정 직전) / 15:00:00Z = KST 06-11 00:00:00 (직후).
        val rows = listOf(
            log(1, Instant.parse("2035-06-10T14:59:59Z")), // KST 06-10, user 1
            log(1, Instant.parse("2035-06-10T15:00:00Z")), // KST 06-11, user 1
            log(1, Instant.parse("2035-06-10T20:00:00Z")), // KST 06-11, user 1 (같은 날 중복 → 1명)
            log(2, Instant.parse("2035-06-10T20:00:00Z")), // KST 06-11, user 2
            log(2, Instant.parse("2035-06-10T02:00:00Z")), // KST 06-10, user 2
        )
        rows.forEach { accessLogs.saveAndFlush(it) }

        val since = Instant.parse("2035-06-01T00:00:00Z")
        val expected = appSideExpected(rows)

        // 기대 절대값도 명시(회귀 가드): 두 날짜 모두 서로 다른 사용자 2명.
        assertEquals(
            mapOf(LocalDate.of(2035, 6, 10) to 2L, LocalDate.of(2035, 6, 11) to 2L),
            expected,
        )
        assertEquals(expected, dbResult(since))
    }
}
