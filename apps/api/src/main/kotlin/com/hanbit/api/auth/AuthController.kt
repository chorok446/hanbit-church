package com.hanbit.api.auth

import com.hanbit.api.common.ClientRequestInfo
import com.hanbit.api.security.AuthCookies
import com.hanbit.api.security.AuthUser
import com.hanbit.api.security.authCookieToken
import com.hanbit.api.security.refreshCookieToken
import io.swagger.v3.oas.annotations.Operation
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpHeaders
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/** HTTP adapter. 후기 작성자 추출 후 Service 위임과 status code 반환만 담당한다. */
@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "인증 및 계정 API")
class AuthController(
    private val authService: AuthService,
    private val accountService: AccountService,
    private val authCookies: AuthCookies,
    private val accessLogService: AccessLogService,
    private val twoFactorService: TwoFactorService,
) {

    @Operation(summary = "회원가입", description = "승인제가 켜져 있으면 토큰 없이 승인 대기 상태(pendingApproval=true)로 응답한다.")
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    fun signup(@RequestBody req: SignupRequest, http: HttpServletRequest, res: HttpServletResponse): Any {
        val result = authService.signup(req)
        val tokens = result.tokens
            ?: return SignupPendingResponse(name = result.user.name)
        accessLogService.record(tokens.userId, ClientRequestInfo.from(http), tokens.sessionId)
        return res.setAuthCookies(tokens)
    }

    @Operation(summary = "로그인 — 2FA 사용자는 토큰 대신 challengeToken 을 받는다(2fa/verify 로 완료)")
    @PostMapping("/login")
    fun login(@RequestBody req: LoginRequest, http: HttpServletRequest, res: HttpServletResponse): Any =
        when (val outcome = authService.login(req)) {
            is AuthService.LoginOutcome.TwoFactorRequired ->
                TwoFactorChallengeResponse(challengeToken = outcome.challengeToken)
            is AuthService.LoginOutcome.Success -> {
                val tokens = outcome.tokens
                accessLogService.record(tokens.userId, ClientRequestInfo.from(http), tokens.sessionId)
                res.setAuthCookies(tokens)
            }
        }

    @Operation(summary = "2FA 등록 시작 — 인증 앱에 넣을 시크릿·otpauth URL 발급(아직 미활성)")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/2fa/setup")
    fun twoFactorSetup(@AuthenticationPrincipal principal: AuthUser?): TwoFactorSetupResponse =
        twoFactorService.setup(requireUserId(principal))

    @Operation(summary = "2FA 활성화 — 인증 앱 6자리 코드 확인")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/2fa/enable")
    fun twoFactorEnable(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: TwoFactorEnableRequest,
    ): UserProfileResponse = twoFactorService.enable(requireUserId(principal), req)

    @Operation(summary = "2FA 해제 — 비밀번호 재확인")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/2fa/disable")
    fun twoFactorDisable(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: TwoFactorDisableRequest,
    ): UserProfileResponse = twoFactorService.disable(requireUserId(principal), req)

    @Operation(summary = "2FA 로그인 완료 — 챌린지 토큰 + 코드 확인 후 토큰 발급")
    @PostMapping("/2fa/verify")
    fun twoFactorVerify(
        @RequestBody req: TwoFactorVerifyRequest,
        http: HttpServletRequest,
        res: HttpServletResponse,
    ): AuthResponse {
        val tokens = twoFactorService.verifyLogin(req)
        accessLogService.record(tokens.userId, ClientRequestInfo.from(http), tokens.sessionId)
        return res.setAuthCookies(tokens)
    }

    @Operation(summary = "토큰 재발급. refresh 쿠키로 access·refresh 를 재발급한다(rotation).")
    @PostMapping("/refresh")
    fun refresh(req: HttpServletRequest, res: HttpServletResponse): AuthResponse {
        val refreshToken = req.refreshCookieToken()
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "no refresh token")
        val tokens = authService.refresh(refreshToken)
        accessLogService.record(tokens.userId, ClientRequestInfo.from(req), tokens.sessionId)
        return res.setAuthCookies(tokens)
    }

    @Operation(summary = "다른 세션 모두 로그아웃", description = "현재 세션을 제외한 모든 세션(refresh 수명 내)을 무효화한다.")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/sessions")
    fun revokeOtherSessions(@AuthenticationPrincipal principal: AuthUser?): SessionRevokeAllResponse {
        val userId = requireUserId(principal)
        return accessLogService.revokeOtherSessions(userId, principal?.sessionId)
    }

    @Operation(summary = "원격 세션 로그아웃", description = "접속 기록의 다른 세션을 무효화한다. 현재 세션은 400, 남의/모르는 세션은 404.")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/sessions/{sessionId}")
    fun revokeSession(
        @PathVariable sessionId: String,
        @AuthenticationPrincipal principal: AuthUser?,
    ): SessionRevokeResponse {
        val userId = requireUserId(principal)
        return accessLogService.revokeSession(userId, sessionId, principal?.sessionId)
    }

    @Operation(summary = "로그아웃")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/logout")
    fun logout(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestHeader("Authorization", required = false) authHeader: String?,
        req: HttpServletRequest,
        res: HttpServletResponse,
    ): LogoutResponse {
        // principal 이 있으면 필터가 검증한 토큰(Bearer 헤더 또는 인증 쿠키)이 존재한다. 미인증이면 401.
        requireUserId(principal)
        val token = authHeader?.removePrefix("Bearer ")?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: req.authCookieToken()
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated")
        return authService.logout(token, req.refreshCookieToken()).also {
            res.expireAuthCookies()
        }
    }

    @Operation(summary = "내 정보 조회")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/me")
    fun me(@AuthenticationPrincipal principal: AuthUser?): UserProfileResponse =
        authService.getMe(requireUserId(principal))

    @Operation(summary = "접속 기록 조회(최근 1년)")
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/access-logs")
    fun accessLogs(
        @AuthenticationPrincipal principal: AuthUser?,
        page: Int = 0,
        size: Int = 20,
    ): AccessLogPageResponse =
        accessLogService.listForUser(requireUserId(principal), page, size, principal?.sessionId)

    // 프로필/비밀번호/이메일 변경은 claim 이 갱신된 토큰을 재발급한다 → 인증 쿠키도 함께 교체한다.

    @Operation(summary = "프로필 수정")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/me")
    fun updateProfile(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: UpdateProfileRequest,
        res: HttpServletResponse,
    ): UpdateProfileResponse =
        accountService.updateProfile(requireUserId(principal), req, principal?.sessionId).also { res.setAuthCookie(it.token) }

    @Operation(summary = "비밀번호 변경")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/password")
    fun changePassword(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: ChangePasswordRequest,
        res: HttpServletResponse,
    ): ChangePasswordResponse =
        accountService.changePassword(requireUserId(principal), req, principal?.sessionId).also { result ->
            result.token?.let { res.setAuthCookie(it) }
        }

    @Operation(summary = "이메일 변경")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/email")
    fun changeEmail(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: ChangeEmailRequest,
        res: HttpServletResponse,
    ): ChangeEmailResponse =
        accountService.changeEmail(requireUserId(principal), req, principal?.sessionId).also { res.setAuthCookie(it.token) }

    @Operation(summary = "계정 탈퇴")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/me")
    fun deleteAccount(
        @AuthenticationPrincipal principal: AuthUser?,
        @RequestBody req: DeleteAccountRequest,
        res: HttpServletResponse,
    ): DeleteAccountResponse =
        accountService.deleteAccount(requireUserId(principal), req).also {
            // 탈퇴 사용자는 필터·refresh 모두에서 거절되므로 denylist 없이 쿠키만 정리한다.
            res.expireAuthCookies()
        }

    /**
     * 정지 계정 안내(403). 전역 에러 body 는 내부 reason 을 노출하지 않지만(ErrorResponseBodyContractTest),
     * 이 메시지는 사용자에게 보여주려고 작성한 문구라 detail 로 의도적으로 내린다(프론트 apiErrorMessage 가 읽는다).
     */
    @ExceptionHandler(SuspendedAccountException::class)
    fun handleSuspendedAccount(e: SuspendedAccountException): ResponseEntity<Map<String, Any>> =
        ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(mapOf("status" to HttpStatus.FORBIDDEN.value(), "detail" to e.detail))

    private fun requireUserId(principal: AuthUser?): Long =
        principal?.id ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "not authenticated")

    private fun HttpServletResponse.setAuthCookie(token: String) {
        addHeader(HttpHeaders.SET_COOKIE, authCookies.issue(token).toString())
    }

    /** access·refresh 쿠키를 함께 발급하고 body 용 응답만 돌려준다(refresh 는 쿠키로만 전달). */
    private fun HttpServletResponse.setAuthCookies(tokens: IssuedTokens): AuthResponse {
        setAuthCookie(tokens.response.token)
        addHeader(HttpHeaders.SET_COOKIE, authCookies.issueRefresh(tokens.refreshToken).toString())
        return tokens.response
    }

    private fun HttpServletResponse.expireAuthCookies() {
        addHeader(HttpHeaders.SET_COOKIE, authCookies.expire().toString())
        addHeader(HttpHeaders.SET_COOKIE, authCookies.expireRefresh().toString())
    }
}
