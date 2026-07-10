package com.cheolma.api.security

/** JWT 에서 복원한 인증 주체. 컨트롤러에서 @AuthenticationPrincipal 로 주입. */
// sessionId: 로그인 시 발급되는 세션 식별자(JWT sid claim). refresh 회전에도 유지되며
// 접속 기록의 "현재 세션" 표시에 쓴다. sid 없는 구버전 토큰은 null.
data class AuthUser(val id: Long, val name: String, val verified: Boolean, val sessionId: String? = null)
