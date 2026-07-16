package com.hanbit.api.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Authorization: Bearer <jwt> 또는 httpOnly 인증 쿠키를 읽어 SecurityContext 에 인증을 채운다.
 * 헤더가 우선(API 클라이언트·테스트 호환), 없으면 쿠키(브라우저) fallback.
 * - 둘 다 없음 → 미인증으로 통과(공개 엔드포인트 접근 허용).
 * - 토큰이 명시됐는데 invalid이거나 DB 사용자가 없거나 탈퇴함 → 즉시 401, 체인 중단.
 */
@Component
class JwtAuthFilter(
    private val validator: AccessTokenValidator,
) : OncePerRequestFilter() {
    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val header = req.getHeader("Authorization")
        val token = if (header != null && header.startsWith("Bearer ")) header.substring(7) else req.authCookieToken()
        if (token != null) {
            try {
                // 서명·denylist·sid·탈퇴·정지 검증은 WebSocket 핸드셰이크와 공유하는 공통 validator 가 담당한다.
                val validated = validator.validate(token)
                // 권한은 JWT 클레임이 아니라 DB role 에서 매 요청 읽는다(validator 가 조회한 사용자 재사용).
                // 관리자 권한 회수가 기존 토큰 만료를 기다리지 않고 즉시 반영된다.
                val storedUser = validated.user
                val authorities = buildList {
                    add(SimpleGrantedAuthority("ROLE_USER"))
                    // ADMIN 외 스태프 역할(OPERATOR/MINISTRY/NEW_FAMILY/CONTENT)도 ROLE_<역할> 로 부여.
                    if (storedUser.role != com.hanbit.api.auth.UserRole.USER.name &&
                        runCatching { com.hanbit.api.auth.UserRole.valueOf(storedUser.role) }.isSuccess
                    ) {
                        add(SimpleGrantedAuthority("ROLE_${storedUser.role}"))
                    }
                }
                val auth = UsernamePasswordAuthenticationToken(validated.principal, null, authorities)
                SecurityContextHolder.getContext().authentication = auth
            } catch (_: Exception) {
                // 명시적으로 Bearer 토큰을 줬는데 유효하지 않음 → 401 로 즉시 거절
                SecurityContextHolder.clearContext()
                res.status = HttpServletResponse.SC_UNAUTHORIZED
                return
            }
        }
        chain.doFilter(req, res)
    }
}
