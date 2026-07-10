package com.cheolma.api.common.ratelimit

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Component

@Component
class AuthRateLimitFilter(
    rateLimitService: RateLimitService,
) : RateLimitFilterBase(rateLimitService) {
    override fun ruleFor(request: HttpServletRequest): RateLimitRule? {
        if (request.method != HttpMethod.POST.name()) return null
        val path = request.requestURI.removeSuffix("/")
        return when (path) {
            "/api/auth/login" -> RateLimitRule.AUTH_LOGIN
            // 2FA 코드 검증도 로그인과 같은 IP 버킷 — 6자리 코드 무차별 대입 방지(챌린지 5분 TTL 과 조합).
            "/api/auth/2fa/verify" -> RateLimitRule.AUTH_LOGIN
            "/api/auth/signup" -> RateLimitRule.AUTH_SIGNUP
            else -> null
        }
    }
}
