package com.hanbit.api.security

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import io.micrometer.core.instrument.MeterRegistry
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Instant

/**
 * access 토큰 검증 공통 로직 — HTTP(JwtAuthFilter)와 WebSocket 핸드셰이크가 같은 정책을 쓰도록 한 곳에 모은다.
 * 검증 항목: 서명·typ(JwtService.parse) → 토큰 denylist → 세션(sid) denylist → 사용자 존재·탈퇴 → 정지.
 * denylist store 장애는 fail-closed(무효화됐을 수 있는 토큰을 통과시키지 않음). 어느 항목이든 실패하면 예외.
 */
@Component
class AccessTokenValidator(
    private val jwt: JwtService,
    private val users: UserRepository,
    private val denylist: TokenDenylistStore,
    private val meterRegistry: MeterRegistry,
    private val clock: Clock,
) {
    data class ValidatedAccess(val principal: AuthUser, val user: User)

    /** 유효하면 검증된 사용자를, 무효(서명·denylist·sid·탈퇴·정지·store 장애)면 예외를 던진다. */
    fun validate(token: String): ValidatedAccess {
        val principal = jwt.parse(token) // 서명·typ(refresh/2fa 거절) 검증
        // 로그아웃된 토큰은 만료 전이라도 거절. 서명·형식 검증 이후에만 조회한다.
        if (isDeniedFailClosed(hashToken(token))) {
            throw IllegalArgumentException("denylisted token or denylist unavailable")
        }
        // 원격 세션 로그아웃 — 세션(sid) 단위 무효화도 같은 denylist 로 검사한다(fail-closed 동일).
        if (principal.sessionId != null && isDeniedFailClosed(sessionDenyKey(principal.sessionId))) {
            throw IllegalArgumentException("revoked session")
        }
        val stored = users.findById(principal.id).orElse(null)
            ?: throw IllegalArgumentException("inactive token user")
        if (stored.deletedAt != null) {
            throw IllegalArgumentException("deleted token user")
        }
        // 정지 계정은 기존 토큰도 즉시 차단(토큰 만료를 기다리지 않는다).
        if (stored.isSuspendedAt(Instant.now(clock))) {
            throw IllegalArgumentException("suspended token user")
        }
        return ValidatedAccess(principal, stored)
    }

    /**
     * denylist 등록 여부. store(예: Redis) 장애로 확인할 수 없으면 fail-closed:
     * 무효화됐을 수 있는 토큰을 통과시키지 않고 거절한다(인증 보안 경로 → rate limit 의 fail-open 과 반대).
     */
    private fun isDeniedFailClosed(denyKey: String): Boolean =
        try {
            denylist.isDenied(denyKey)
        } catch (ex: Exception) {
            // store 장애로 무효화 여부 확인 불가 → fail-closed. metric·경고 로그만 남긴다(민감정보 미출력).
            meterRegistry.counter(STORE_UNAVAILABLE_METRIC, "policy", "fail_closed").increment()
            log.warn("denylist store unavailable, failing closed (policy=fail_closed, denying request)", ex)
            true
        }

    private companion object {
        private val log = org.slf4j.LoggerFactory.getLogger(AccessTokenValidator::class.java)
        const val STORE_UNAVAILABLE_METRIC = "hanbit.security.token_denylist.store_unavailable"
    }
}
