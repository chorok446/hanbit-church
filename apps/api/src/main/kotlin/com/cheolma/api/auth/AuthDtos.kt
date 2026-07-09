package com.cheolma.api.auth

import io.swagger.v3.oas.annotations.media.Schema

@Schema(description = "회원가입 요청")
data class SignupRequest(
    @field:Schema(description = "이메일", example = "user@example.com")
    val email: String,
    @field:Schema(description = "비밀번호", example = "Password1!")
    val password: String,
    @field:Schema(description = "표시 이름", example = "홍길동")
    val name: String,
)

@Schema(description = "로그인 요청")
data class LoginRequest(
    @field:Schema(description = "이메일", example = "user@example.com")
    val email: String,
    @field:Schema(description = "비밀번호", example = "Password1!")
    val password: String,
)

@Schema(description = "인증 응답. token 은 이후 요청에 Bearer 로 사용한다.")
data class AuthResponse(val token: String, val name: String, val verified: Boolean)

@Schema(description = "회원가입 승인 대기 응답(승인제). 토큰은 발급되지 않는다.")
data class SignupPendingResponse(val pendingApproval: Boolean = true, val name: String)

/**
 * 토큰 발급 내부 결과. refreshToken 은 응답 body 에 노출하지 않고 httpOnly 쿠키로만 전달한다
 * (JS 접근 차단 — body 에 실으면 localStorage 저장 유혹이 생겨 쿠키 전환 의미가 없어진다).
 */
data class IssuedTokens(val response: AuthResponse, val refreshToken: String, val userId: Long)

@Schema(description = "내 프로필")
data class UserProfileResponse(
    val id: Long,
    val email: String,
    val name: String,
    val verified: Boolean,
    val profileImageUrl: String? = null,
    val notifyEventUpdates: Boolean = true,
    @field:Schema(description = "역할", allowableValues = ["USER", "ADMIN"])
    val role: String = "USER",
    @field:Schema(description = "찬양팀 역할(LEADER/MEMBER/GUEST). null = 찬양팀 아님")
    val praiseRole: String? = null,
    @field:Schema(description = "찬양팀 파트 목록")
    val praiseParts: List<String> = emptyList(),
)

@Schema(description = "공개 프로필(타인 조회용)")
data class PublicUserResponse(
    val id: Long,
    val name: String,
    val verified: Boolean,
    val profileImageUrl: String? = null,
    val postCount: Long,
    val blockedByMe: Boolean? = null,
)

data class PublicUserPageResponse(
    val content: List<PublicUserResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

@Schema(description = "프로필 수정 요청")
data class UpdateProfileRequest(
    @field:Schema(description = "변경할 표시 이름", example = "홍길동")
    val name: String,
    @field:Schema(description = "프로필 이미지 URL(http/https, 최대 500자). null/blank면 제거")
    val profileImageUrl: String? = null,
    @field:Schema(description = "행사 상태 변경 알림 수신 여부")
    val notifyEventUpdates: Boolean = true,
)

data class UpdateProfileResponse(val token: String, val profile: UserProfileResponse)

@Schema(description = "비밀번호 변경 요청")
data class ChangePasswordRequest(
    @field:Schema(description = "현재 비밀번호")
    val currentPassword: String,
    @field:Schema(description = "새 비밀번호", example = "Password1!")
    val newPassword: String,
)

data class ChangePasswordResponse(val changed: Boolean, val token: String?)

@Schema(description = "이메일 변경 요청")
data class ChangeEmailRequest(
    @field:Schema(description = "현재 비밀번호")
    val currentPassword: String,
    @field:Schema(description = "새 이메일", example = "new@example.com")
    val newEmail: String,
)

data class ChangeEmailResponse(val email: String, val name: String, val token: String)

@Schema(description = "계정 탈퇴 요청")
data class DeleteAccountRequest(
    @field:Schema(description = "현재 비밀번호")
    val currentPassword: String,
    @field:Schema(description = "확인 문구")
    val confirmText: String,
)

data class DeleteAccountResponse(val deleted: Boolean)

data class LogoutResponse(val loggedOut: Boolean)

data class AccessLogResponse(
    val id: Long,
    val ipAddress: String,
    val os: String,
    @field:Schema(description = "User-Agent 기반 브라우저 이름")
    val browser: String = "알 수 없음",
    @field:Schema(description = "IP 기반 대략적 위치(지역 · 국가). 조회 실패 시 null.")
    val location: String? = null,
    val accessedAt: String,
)

data class AccessLogPageResponse(
    val content: List<AccessLogResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)
