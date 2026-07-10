package com.cheolma.api.auth

import com.cheolma.api.security.JwtService
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.util.UUID

/**
 * 계정 관리 도메인 서비스. 로그인 세션 수명(AuthService)과 분리해 프로필 수정/비밀번호·이메일 변경/계정 탈퇴를 담당한다.
 * 작성물 author snapshot 전파는 UserAuthorSnapshotSync 로 위임해 저장소 의존을 줄인다.
 */
@Service
class AccountService(
    private val repo: UserRepository,
    private val encoder: PasswordEncoder,
    private val jwt: JwtService,
    private val authorSnapshot: UserAuthorSnapshotSync,
    private val accessLogs: AccessLogService,
    private val userBlocks: UserBlockRepository,
    private val clock: Clock,
) {
    @Transactional
    fun updateProfile(userId: Long, req: UpdateProfileRequest): UpdateProfileResponse {
        val user = repo.findActiveOrThrow(userId)
        user.name = normalizeName(req.name)
        user.profileImageUrl = normalizeProfileImageUrl(req.profileImageUrl)
        user.notifyEventUpdates = req.notifyEventUpdates
        // 기존 작성물의 author snapshot 도 최신 이름·이미지로 맞춘다.
        authorSnapshot.syncProfile(userId, user.name, user.profileImageUrl)
        return UpdateProfileResponse(token = jwt.issue(user), profile = user.toProfile())
    }

    @Transactional
    fun changePassword(userId: Long, req: ChangePasswordRequest): ChangePasswordResponse {
        val user = repo.findActiveOrThrow(userId)
        if (req.currentPassword.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is required")
        }
        if (!encoder.matches(req.currentPassword, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is incorrect")
        }
        validatePassword(req.newPassword)
        if (encoder.matches(req.newPassword, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "new password must be different")
        }
        user.passwordHash = encoder.encode(req.newPassword)!!
        return ChangePasswordResponse(changed = true, token = jwt.issue(user))
    }

    @Transactional
    fun changeEmail(userId: Long, req: ChangeEmailRequest): ChangeEmailResponse {
        val user = repo.findActiveOrThrow(userId)
        if (req.currentPassword.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is required")
        }
        if (!encoder.matches(req.currentPassword, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is incorrect")
        }

        val email = normalizeEmail(req.newEmail)
        if (email == user.email) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "new email must be different")
        }
        if (repo.existsByEmail(email)) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "email already registered")
        }

        user.email = email
        try {
            repo.saveAndFlush(user)
        } catch (_: DataIntegrityViolationException) {
            // 사전 중복 체크 뒤 발생한 동시 변경 경쟁도 DB unique 제약 기준으로 409 처리한다.
            throw ResponseStatusException(HttpStatus.CONFLICT, "email already registered")
        }
        return ChangeEmailResponse(email = user.email, name = user.name, token = jwt.issue(user))
    }

    @Transactional
    fun deleteAccount(userId: Long, req: DeleteAccountRequest): DeleteAccountResponse {
        val user = repo.findActiveOrThrow(userId)
        if (req.currentPassword.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is required")
        }
        if (req.confirmText.isBlank() || req.confirmText != DELETE_CONFIRM_TEXT) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "delete confirmation is incorrect")
        }
        if (!encoder.matches(req.currentPassword, user.passwordHash)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "current password is incorrect")
        }

        val id = requireNotNull(user.id)
        user.email = "deleted-$id-${UUID.randomUUID()}@deleted.local"
        user.name = DELETED_USER_NAME
        user.passwordHash = encoder.encode(UUID.randomUUID().toString())!!
        user.deletedAt = Instant.now(clock)
        repo.saveAndFlush(user)

        authorSnapshot.anonymize(id, DELETED_USER_NAME)
        accessLogs.deleteForUser(id)
        userBlocks.deleteAllForUser(id)
        return DeleteAccountResponse(deleted = true)
    }

    private companion object {
        const val DELETED_USER_NAME = "탈퇴한 사용자"
        const val DELETE_CONFIRM_TEXT = "탈퇴합니다"
    }
}
