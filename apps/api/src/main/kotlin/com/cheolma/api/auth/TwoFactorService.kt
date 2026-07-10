package com.cheolma.api.auth

import com.cheolma.api.security.JwtService
import com.cheolma.api.security.Totp
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
    private val clock: Clock,
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
            otpauthUrl = Totp.otpauthUrl(secret, user.email, ISSUER),
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

    /** 로그인 2단계 — 챌린지 토큰 + 앱 코드 확인 후 실제 토큰 발급. */
    @Transactional(readOnly = true)
    fun verifyLogin(req: TwoFactorVerifyRequest): IssuedTokens {
        val userId = try {
            jwt.parseTwoFactorChallenge(req.challengeToken)
        } catch (_: Exception) {
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
        return authService.issueTokensFor(user)
    }

    private companion object {
        const val ISSUER = "철마제일교회"
    }
}
