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
    private val writer: AccessLogWriter,
    private val clock: Clock,
) {
    /**
     * 접속 기록. GeoIP 조회(외부 HTTP·최대 ~2s)는 **트랜잭션 밖**에서 먼저 수행한 뒤 DB 쓰기만 트랜잭션으로 넘긴다
     * — 예전엔 @Transactional 안에서 HTTP 를 호출해 로그인 동안 DB 커넥션을 물고 있었다(풀 고갈 위험).
     */
    fun record(userId: Long, info: ClientRequestInfo) {
        val ip = normalizeIp(info.ipAddress)
        // 위치는 best-effort — 실패해도 로그인 흐름을 막지 않는다(GeoIpService 가 짧은 타임아웃으로 null 반환).
        val geo = geoIp.lookup(ip)
        writer.write(userId, ip, info, geo, Instant.now(clock))
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

/**
 * 접속 기록 DB 쓰기 전용 컴포넌트. GeoIP 외부 호출을 트랜잭션 밖에 두기 위해 record()에서 분리했다
 * — 트랜잭션은 이 write() 안(INSERT + 보존기간 삭제)에서만 열린다.
 */
@Service
class AccessLogWriter(
    private val repo: UserAccessLogRepository,
) {
    @Transactional
    fun write(userId: Long, ip: String, info: ClientRequestInfo, geo: GeoLocation?, now: Instant) {
        repo.save(
            UserAccessLog(
                userId = userId,
                ipAddress = ip,
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

    private companion object {
        const val RETENTION_DAYS = 365L
    }
}
