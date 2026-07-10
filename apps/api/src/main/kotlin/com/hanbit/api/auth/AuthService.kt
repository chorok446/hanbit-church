package com.hanbit.api.auth

import com.hanbit.api.common.ratelimit.RateLimitRule
import com.hanbit.api.common.ratelimit.RateLimitService
import com.hanbit.api.security.JwtService
import com.hanbit.api.security.TokenDenylistStore
import com.hanbit.api.security.hashToken
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant

/**
 * 인증(세션 수명) 도메인 서비스. 회원가입/로그인/토큰 재발급/로그아웃/내 정보 조회를 담당한다.
 * 프로필·비밀번호·이메일·탈퇴 등 계정 관리는 AccountService 로 분리했다.
 */
@Service
class AuthService(
    private val repo: UserRepository,
    private val encoder: PasswordEncoder,
    private val jwt: JwtService,
    private val denylist: TokenDenylistStore,
    private val rateLimitService: RateLimitService,
    private val clock: Clock,
    // 회원가입 관리자 승인제. 테스트에서는 false 로 두어 기존 가입→즉시 사용 플로를 유지한다.
    @param:org.springframework.beans.factory.annotation.Value("\${app.signup.require-approval:true}")
    private val signupRequiresApproval: Boolean,
) {
    // 유저 없을 때 BCrypt 시간을 맞추기 위한 더미 해시(1회 계산). 타이밍 기반 가입여부 노출 방지용.
    private val dummyHash = encoder.encode("__no_such_user__")

    /**
     * 회원가입 결과. 승인제가 켜져 있으면 tokens 없이 승인 대기 상태로 만들어지고,
     * 꺼져 있으면(테스트) 기존처럼 즉시 로그인 토큰이 발급된다.
     */
    data class SignupResult(val user: User, val tokens: IssuedTokens?)

    @Transactional
    fun signup(req: SignupRequest): SignupResult {
        val email = normalizeEmail(req.email)
        val name = normalizeName(req.name)
        validatePassword(req.password)
        // 빠른 실패용 사전 체크. 동시 가입 경쟁은 아래 unique 제약 위반 catch 로 처리.
        if (repo.existsByEmail(email)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "email already registered")
        }
        val user = try {
            // saveAndFlush 로 트랜잭션 안에서 INSERT 를 강제해, unique 제약 위반을 이 자리에서 catch → 409 로 변환한다.
            // [spike] Spring Security 7 에서 PasswordEncoder.encode 반환이 @Nullable(String?) 로 변경 → non-null 보장.
            repo.saveAndFlush(
                User(
                    email = email,
                    passwordHash = encoder.encode(req.password)!!,
                    name = name,
                    createdAt = Instant.now(clock),
                    // 승인제: 관리자가 승인할 때까지 로그인 불가.
                    approvedAt = if (signupRequiresApproval) null else Instant.now(clock),
                ),
            )
        } catch (e: DataIntegrityViolationException) {
            // 동시 요청이 사전 체크를 둘 다 통과한 경우 → unique 제약 위반을 409 로 변환(500 방지)
            throw ResponseStatusException(HttpStatus.CONFLICT, "email already registered")
        }
        return SignupResult(user, if (user.isPendingApproval) null else issueTokens(user))
    }

    @Transactional(readOnly = true)
    fun login(req: LoginRequest): IssuedTokens {
        val emailKey = req.email.trim().lowercase()
        // IP 한도(AuthRateLimitFilter)와 별개로 계정당 시도를 제한한다 — 분산 IP 로 단일 계정을 노리는 추측 차단.
        // 존재하지 않는 email 도 동일하게 계수해 계정 존재 여부가 새지 않도록 한다.
        rateLimitService.enforce(RateLimitRule.AUTH_LOGIN_ACCOUNT, emailKey)
        val user = repo.findByEmail(emailKey)
        if (user == null || user.deletedAt != null) {
            // ponytail: 유저가 없어도 BCrypt 1회 실행 → 응답시간 차이로 가입 여부가 새는 것을 방지
            encoder.matches(req.password, user?.passwordHash ?: dummyHash)
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials")
        }
        if (!encoder.matches(req.password, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials")
        }
        // 비밀번호 검증 후에만 정지·승인 대기 여부를 알린다(자격 증명 없이 상태가 새지 않도록).
        requireNotSuspended(user)
        requireApproved(user)
        return issueTokens(user)
    }

    /** 승인 대기 계정 로그인 차단. 메시지는 프론트가 그대로 노출한다(403, SuspendedAccountException 과 같은 경로). */
    private fun requireApproved(user: User) {
        if (user.isPendingApproval) {
            throw SuspendedAccountException("관리자 승인 대기 중인 계정입니다. 승인이 완료되면 로그인할 수 있어요.")
        }
    }

    /** 정지 계정 로그인 차단. 사용자에게 그대로 보여줄 한국어 안내를 담는다(403 body 변환은 AuthController). */
    private fun requireNotSuspended(user: User) {
        val until = user.suspendedUntil ?: return
        val now = Instant.now(clock)
        if (!until.isAfter(now)) return
        val message = if (until.isAfter(now.plus(java.time.Duration.ofDays(365L * 50)))) {
            "이용이 영구 정지된 계정입니다."
        } else {
            val untilLabel = java.time.LocalDate.ofInstant(until, java.time.ZoneId.of("Asia/Seoul"))
            "이용이 정지된 계정입니다. ($untilLabel 까지)"
        }
        throw SuspendedAccountException(message)
    }

    /**
     * refresh token 으로 access·refresh 를 재발급한다(rotation: 사용한 refresh 는 denylist 등록해
     * 재사용을 차단 — 탈취된 refresh 가 재사용되면 정당한 사용자의 다음 refresh 가 실패해 이상 징후가 된다).
     * 유효하지 않거나 denylist 에 있거나 사용자가 비활성이면 401.
     */
    @Transactional(readOnly = true)
    fun refresh(refreshToken: String): IssuedTokens {
        val claims = try {
            jwt.parseRefresh(refreshToken)
        } catch (_: Exception) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token")
        }
        val userId = claims.userId
        // store 장애로 확인 불가면 fail-closed(denylist 정책과 동일): 무효화됐을 수 있는 refresh 를 통과시키지 않는다.
        val denied = try {
            denylist.isDenied(hashToken(refreshToken))
        } catch (_: Exception) {
            true
        }
        if (denied) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token")
        }
        val user = repo.findById(userId).orElse(null)
        if (user == null || user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token")
        }
        // 정지·승인 대기 계정은 refresh 로도 세션을 연장할 수 없다.
        if (user.isSuspendedAt(Instant.now(clock)) || user.isPendingApproval) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid refresh token")
        }
        denylist.deny(hashToken(refreshToken), jwt.remainingTtlSeconds(refreshToken))
        // rotation 시 세션 id 유지 — 접속 기록 "현재 세션" 표시가 refresh 후에도 이어진다.
        return issueTokens(user, claims.sessionId ?: newSessionId())
    }

    /**
     * 로그아웃. access token(필수)과 refresh token(있으면)을 만료 시간까지 denylist 에 등록해 재사용을 막는다.
     * access 는 필터에서 이미 검증된 유효 토큰만 여기 도달한다. refresh 는 검증 없이 온 쿠키 값이므로
     * 유효할 때만 등록한다(invalid 면 어차피 refresh 불가라 무시).
     */
    fun logout(token: String, refreshToken: String?): LogoutResponse {
        denylist.deny(hashToken(token), jwt.remainingTtlSeconds(token))
        refreshToken?.let {
            try {
                denylist.deny(hashToken(it), jwt.remainingTtlSeconds(it))
            } catch (_: Exception) {
                // 서명이 깨진 refresh 쿠키 — 재사용될 수 없으므로 무시
            }
        }
        return LogoutResponse(loggedOut = true)
    }

    private fun issueTokens(user: User, sessionId: String = newSessionId()): IssuedTokens =
        IssuedTokens(
            user.toAuthResponse(jwt.issue(user, sessionId)),
            jwt.issueRefresh(user, sessionId),
            requireNotNull(user.id),
            sessionId,
        )

    private fun newSessionId(): String = java.util.UUID.randomUUID().toString()

    @Transactional(readOnly = true)
    fun getMe(userId: Long): UserProfileResponse = repo.findActiveOrThrow(userId).toProfile()

    /** 공개 프로필 조회용. 탈퇴·미존재는 404. */
    fun publicUser(userId: Long): User {
        val user = repo.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        return user
    }

}

/**
 * 정지 계정 로그인 안내. 전역 정책상 ResponseStatusException 의 reason 은 에러 body 로 노출되지 않으므로
 * (ErrorResponseBodyContractTest), 사용자 안내용으로 작성된 이 메시지만 AuthController 의
 * @ExceptionHandler 가 403 body 의 detail 로 의도적으로 노출한다.
 */
class SuspendedAccountException(val detail: String) : RuntimeException(detail)
