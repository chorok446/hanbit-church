package com.hanbit.api.auth

import com.hanbit.api.common.ClientRequestInfo
import com.hanbit.api.common.checkPageParams
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
    private val notifications: com.hanbit.api.notification.NotificationService,
    private val clock: Clock,
) {
    /**
     * 접속 기록. GeoIP 조회(외부 HTTP·최대 ~2s)는 **트랜잭션 밖**에서 먼저 수행한 뒤 DB 쓰기만 트랜잭션으로 넘긴다
     * — 예전엔 @Transactional 안에서 HTTP 를 호출해 로그인 동안 DB 커넥션을 물고 있었다(풀 고갈 위험).
     */
    fun record(userId: Long, info: ClientRequestInfo, sessionId: String? = null) {
        val ip = normalizeIp(info.ipAddress)
        // 위치는 best-effort — 실패해도 로그인 흐름을 막지 않는다(GeoIpService 가 짧은 타임아웃으로 null 반환).
        val geo = geoIp.lookup(ip)
        val now = Instant.now(clock)
        // 새 기기 판정은 INSERT 전에 한다 — 이력이 있는 사용자가 처음 보는 (IP, 브라우저) 조합이면 새 기기.
        // 첫 로그인(이력 없음)은 계정 생성 직후라 알리지 않는다.
        val browser = info.browser.take(32)
        val isNewDevice = runCatching {
            repo.existsByUserId(userId) && !repo.existsByUserIdAndIpAddressAndBrowser(userId, ip, browser)
        }.getOrDefault(false)
        // 접속 기록 전체가 best-effort — INSERT/보존기간 삭제가 실패(데드락 등)해도 로그인을 500 으로 만들지 않는다.
        // 삭제는 INSERT 와 **별도 트랜잭션**이어야 한다: 같은 트랜잭션이면 동시 로그인 데드락이 rollback-only 를
        // 남겨 커밋 시점에 UnexpectedRollbackException 으로 터진다(트랜잭션 안 runCatching 으로는 못 막음).
        runCatching { writer.write(userId, ip, info, geo, now, sessionId) }
        runCatching { writer.pruneOlderThanRetention(now) }
        if (isNewDevice) {
            val location = listOfNotNull(geo?.region, geo?.country).joinToString(" · ").ifBlank { null }
            runCatching {
                notifications.notifyUser(
                    recipientUserId = userId,
                    type = com.hanbit.api.notification.NotificationType.NEW_DEVICE_LOGIN,
                    title = "새 기기에서 로그인되었습니다",
                    body = buildString {
                        append("${info.browser} · ${info.os}")
                        if (location != null) append(" · $location")
                        append(" 에서 로그인했습니다. 본인이 아니면 비밀번호를 변경해 주세요.")
                    }.take(200),
                    href = "/mypage?tab=access",
                )
            }
        }
    }

    @Transactional(readOnly = true)
    fun listForUser(userId: Long, page: Int, size: Int, currentSessionId: String? = null): AccessLogPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val since = Instant.now(clock).minus(RETENTION_DAYS, ChronoUnit.DAYS)
        val result = repo.findByUserIdAndAccessedAtAfterOrderByAccessedAtDesc(
            userId,
            since,
            PageRequest.of(page, size),
        )
        return AccessLogPageResponse(
            content = result.content.map { it.toResponse(currentSessionId) },
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

    private fun UserAccessLog.toResponse(currentSessionId: String?) = AccessLogResponse(
        id = requireNotNull(id),
        ipAddress = ipAddress,
        os = os,
        browser = browser,
        // "부산광역시 · 대한민국" 형태의 표시용 위치. 없으면 null.
        location = listOfNotNull(region, country).takeIf { it.isNotEmpty() }?.joinToString(" · "),
        accessedAt = accessedAt.toString(),
        // sid 없는 과거 기록·구버전 토큰은 항상 false — 배지가 잘못 붙는 것보다 낫다.
        currentSession = sessionId != null && sessionId == currentSessionId,
    )

    private fun normalizeIp(ip: String): String = ip.take(45).ifBlank { "unknown" }

    private companion object {
        const val RETENTION_DAYS = 365L
        const val MAX_PAGE_SIZE = 50
    }
}

/**
 * 접속 기록 DB 쓰기 전용 컴포넌트. GeoIP 외부 호출을 트랜잭션 밖에 두기 위해 record()에서 분리했다.
 * INSERT 와 보존기간 삭제는 **서로 다른 트랜잭션**이다 — 같은 트랜잭션에 두면 동시 로그인에서
 * 범위 DELETE(갭 락) ↔ INSERT 데드락이 트랜잭션을 rollback-only 로 마킹하고, 커밋 시점의
 * UnexpectedRollbackException 이 로그인 응답을 500 으로 만든다(e2e 병렬 실행에서 실제 재현).
 */
@Service
class AccessLogWriter(
    private val repo: UserAccessLogRepository,
) {
    @Transactional
    fun write(userId: Long, ip: String, info: ClientRequestInfo, geo: GeoLocation?, now: Instant, sessionId: String? = null) {
        repo.save(
            UserAccessLog(
                userId = userId,
                ipAddress = ip,
                os = info.os.take(32),
                accessedAt = now,
                browser = info.browser.take(32),
                country = geo?.country?.take(64),
                region = geo?.region?.take(64),
                sessionId = sessionId?.take(36),
            ),
        )
    }

    /** 보존기간 지난 기록 삭제. 실패(데드락 등)해도 다음 record 호출에서 자연히 재시도된다. */
    @Transactional
    fun pruneOlderThanRetention(now: Instant) {
        repo.deleteByAccessedAtBefore(now.minus(RETENTION_DAYS, ChronoUnit.DAYS))
    }

    private companion object {
        const val RETENTION_DAYS = 365L
    }
}
