package com.dasida.api.auth

import com.dasida.api.common.ClientRequestInfo
import com.dasida.api.common.checkPageParams
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class AccessLogService(
    private val repo: UserAccessLogRepository,
    private val geoIp: GeoIpService,
    private val clock: Clock,
) {
    @Transactional
    fun record(userId: Long, info: ClientRequestInfo) {
        val now = Instant.now(clock)
        // 위치는 best-effort — 실패해도 로그인 흐름을 막지 않는다(GeoIpService 가 짧은 타임아웃으로 null 반환).
        val geo = geoIp.lookup(normalizeIp(info.ipAddress))
        repo.save(
            UserAccessLog(
                userId = userId,
                ipAddress = normalizeIp(info.ipAddress),
                os = info.os.take(32),
                accessedAt = now,
                browser = info.browser.take(32),
                country = geo?.country?.take(64),
                region = geo?.region?.take(64),
            ),
        )
        // 보존기간 삭제는 best-effort — 동시 로그인 INSERT 와 데드락이 나면 로그인 자체를 실패시키지 않는다.
        // (e2e 에서 실제 데드락 → 로그인 500 재현됨. 다음 record 호출에서 자연히 재시도된다.)
        runCatching { repo.deleteByAccessedAtBefore(now.minus(RETENTION_DAYS, ChronoUnit.DAYS)) }
    }

    @Transactional(readOnly = true)
    fun listForUser(userId: Long, page: Int, size: Int): AccessLogPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val since = Instant.now(clock).minus(RETENTION_DAYS, ChronoUnit.DAYS)
        val result = repo.findByUserIdAndAccessedAtAfterOrderByAccessedAtDesc(
            userId,
            since,
            PageRequest.of(page, size),
        )
        return AccessLogPageResponse(
            content = result.content.map { it.toResponse() },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    @Transactional
    fun deleteForUser(userId: Long) {
        repo.deleteByUserId(userId)
    }

    private fun UserAccessLog.toResponse() = AccessLogResponse(
        id = requireNotNull(id),
        ipAddress = ipAddress,
        os = os,
        browser = browser,
        // "부산광역시 · 대한민국" 형태의 표시용 위치. 없으면 null.
        location = listOfNotNull(region, country).takeIf { it.isNotEmpty() }?.joinToString(" · "),
        accessedAt = accessedAt.toString(),
    )

    private fun normalizeIp(ip: String): String = ip.take(45).ifBlank { "unknown" }

    private companion object {
        const val RETENTION_DAYS = 365L
        const val MAX_PAGE_SIZE = 50
    }
}
