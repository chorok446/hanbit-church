package com.hanbit.api.admin

import com.hanbit.api.auth.UserAccessLogRepository
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.event.EventRepository
import com.hanbit.api.post.PostRepository
import com.hanbit.api.report.ReportRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * 관리자 통계. 가입·게시글·행사·신고의 일별 생성 건수와 일별 활성 회원(DAU)을 집계한다.
 * 생성 건수는 콘텐츠 seq(epoch millis)·사용자 createdAt 을 기간 필터로만 조회하고 일 버킷팅을
 * 서버에서 처리한다(단순 count 라 데이터량이 작고 H2/MySQL date 함수 차이를 피할 수 있다).
 * DAU 는 distinct 비용이 커 DB단에서 KST 일 버킷·distinct 집계하고(정수 epoch-day 만 반환해
 * date 타입 매핑 차이를 회피 — UserAccessLogRepository.dailyActiveUsersSince) 앱은 결과만 매핑한다.
 */
@Service
class AdminStatsService(
    private val users: UserRepository,
    private val accessLogs: UserAccessLogRepository,
    private val posts: PostRepository,
    private val events: EventRepository,
    private val reports: ReportRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getDailyStats(days: Int): AdminStatsResponse {
        if (days < 1 || days > MAX_DAYS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "days must be between 1 and $MAX_DAYS")
        }
        val today = Instant.now(clock).atZone(ZONE).toLocalDate()
        val start = today.minusDays(days - 1L)
        val since = start.atStartOfDay(ZONE).toInstant()

        val signups = users.signupTimesSince(since).groupingBy { it.toLocalDateAtZone() }.eachCount()
        val postCounts = posts.creationSeqSince(since.toEpochMilli()).groupingBy { it.toLocalDateAtZone() }.eachCount()
        val eventCounts = events.creationSeqSince(since.toEpochMilli()).groupingBy { it.toLocalDateAtZone() }.eachCount()
        val reportCounts = reports.creationSeqSince(since.toEpochMilli()).groupingBy { it.toLocalDateAtZone() }.eachCount()
        // 일별 활성 회원(DAU): 접속 기록의 (userId, 날짜) distinct 카운트를 DB단에서 KST 일 버킷으로 집계.
        val activeUsers = accessLogs.dailyActiveUsersSince(since)
            .associate { row -> LocalDate.ofEpochDay((row[0] as Number).toLong()) to (row[1] as Number).toLong() }

        val daily = (0 until days).map { offset ->
            val date = start.plusDays(offset.toLong())
            AdminDailyStat(
                date = date.toString(),
                signups = (signups[date] ?: 0).toLong(),
                posts = (postCounts[date] ?: 0).toLong(),
                events = (eventCounts[date] ?: 0).toLong(),
                reports = (reportCounts[date] ?: 0).toLong(),
                activeUsers = activeUsers[date] ?: 0L,
            )
        }
        return AdminStatsResponse(days = days, daily = daily)
    }

    private fun Instant.toLocalDateAtZone(): LocalDate = atZone(ZONE).toLocalDate()

    private fun Long.toLocalDateAtZone(): LocalDate = Instant.ofEpochMilli(this).atZone(ZONE).toLocalDate()

    companion object {
        internal const val MAX_DAYS = 90

        /** 일 버킷 기준 시간대. 운영·사용자 기반이 한국이라 KST 고정. */
        private val ZONE: ZoneId = ZoneId.of("Asia/Seoul")
    }
}
