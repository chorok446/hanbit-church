package com.hanbit.api.auth

import com.hanbit.api.security.JwtService
import com.hanbit.api.security.TokenDenylistStore
import com.hanbit.api.security.Totp
import com.hanbit.api.security.hashToken
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant

/**
 * 2단계 인증(TOTP) 등록·해제·로그인 검증.
 * 등록은 2단계: setup(시크릿 발급, 미활성) → enable(앱 코드 확인 후 활성).
 * 활성 사용자의 로그인은 AuthService.login 이 챌린지 토큰을 돌려주고, verifyLogin 이 코드 확인 후 토큰을 발급한다.
 */
@Service
class TwoFactorService(
    private val repo: UserRepository,
    private val jwt: JwtService,
    private val encoder: PasswordEncoder,
    private val authService: AuthService,
    private val denylist: TokenDenylistStore,
    private val clock: Clock,
    // 인증 앱에 표시되는 발급자명 — 배포 교회명(env)을 따라간다. 기존 등록분의 앱 표기는 바뀌지 않는다.
    @org.springframework.beans.factory.annotation.Value("\${app.church.name:한빛교회}") private val issuer: String,
) {
    @Transactional
    fun setup(userId: Long): TwoFactorSetupResponse {
        val user = repo.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated") }
        if (user.totpEnabled) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "two-factor already enabled")
        }
        val secret = Totp.generateSecret()
        user.totpSecret = secret
        user.totpEnabledAt = null
        return TwoFactorSetupResponse(
            secret = secret,
            otpauthUrl = Totp.otpauthUrl(secret, user.email, issuer),
        )
    }

    @Transactional
    fun enable(userId: Long, req: TwoFactorEnableRequest): UserProfileResponse {
        val user = repo.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated") }
        val secret = user.totpSecret
            ?: throw ResponseStatusException(HttpStatus.CONFLICT, "run setup first")
        if (user.totpEnabled) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "two-factor already enabled")
        }
        if (!Totp.verify(secret, req.code, clock)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid code")
        }
        user.totpEnabledAt = Instant.now(clock)
        return user.toProfile()
    }

    /** 해제는 비밀번호 재확인 — 인증앱을 잃어버린 상황에서도 계정 주인이 풀 수 있어야 한다. */
    @Transactional
    fun disable(userId: Long, req: TwoFactorDisableRequest): UserProfileResponse {
        val user = repo.findById(userId).orElseThrow { ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated") }
        if (!encoder.matches(req.password, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials")
        }
        user.totpSecret = null
        user.totpEnabledAt = null
        return user.toProfile()
    }

    /** 로그인 2단계 — 챌린지 토큰 + 앱 코드 확인 후 실제 토큰 발급. 챌린지는 1회용(성공 시 denylist). */
    @Transactional(readOnly = true)
    fun verifyLogin(req: TwoFactorVerifyRequest): IssuedTokens {
        val userId = try {
            jwt.parseTwoFactorChallenge(req.challengeToken)
        } catch (_: Exception) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid challenge")
        }
        // 이미 사용된 챌린지 재사용 차단(fail-closed: store 장애 시 거절 — denylist 정책과 동일).
        val used = try {
            denylist.isDenied(hashToken(req.challengeToken))
        } catch (_: Exception) {
            true
        }
        if (used) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid challenge")
        }
        val user = repo.findById(userId).orElse(null)
        if (user == null || user.deletedAt != null || !user.totpEnabled) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid challenge")
        }
        // 로그인과 같은 상태 검증 — 챌린지 발급 후 정지/승인취소가 일어나도 통과하지 못한다.
        if (user.isSuspendedAt(Instant.now(clock)) || user.isPendingApproval) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid challenge")
        }
        if (!Totp.verify(requireNotNull(user.totpSecret), req.code, clock)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid code")
        }
        // 코드까지 맞은 뒤 챌린지를 원자적으로 1회 소비 — 탈취·리플레이로 같은 챌린지에서 세션 토큰이
        // 두 벌 발급되는 것을 막는다(refresh rotation 과 동일한 consume 계약). 코드 검증 실패 시에는 소비하지 않아
        // 정당한 재입력이 가능하다. store 장애(exception)면 fail-OPEN — 로그인 진행 중인 2FA 사용자를 outage 로
        // 완전 잠그지 않기 위해 원래 정책(runCatching{deny})을 유지한다. 정상 store 에서의 재사용은 false 로 거절.
        val consumed = try {
            denylist.consume(hashToken(req.challengeToken), jwt.remainingTtlSeconds(req.challengeToken).coerceAtLeast(1))
        } catch (_: Exception) {
            true
        }
        if (!consumed) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid challenge")
        }
        return authService.issueTokensFor(user)
    }
}
