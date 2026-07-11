package com.hanbit.api.admin

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.event.EventRepository
import com.hanbit.api.common.checkPageParams
import com.hanbit.api.post.PostRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.format.DateTimeParseException

/**
 * 관리자 회원 관리 서비스. 회원 목록/검색과 정지(제재)·해제를 담당한다.
 * 정지는 JwtAuthFilter(기존 토큰)·login·refresh 세 경로에서 함께 차단된다.
 */
@Service
class AdminUserService(
    private val users: UserRepository,
    private val posts: PostRepository,
    private val events: EventRepository,
    private val actionLogs: AdminActionLogService,
    private val encoder: PasswordEncoder,
    private val accessLogs: com.hanbit.api.auth.AccessLogService,
    private val clock: Clock,
) {
    private val log = org.slf4j.LoggerFactory.getLogger(AdminUserService::class.java)

    @Transactional(readOnly = true)
    fun getUsers(q: String?, suspendedOnly: Boolean, page: Int, size: Int): AdminUsersPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val query = q?.trim()?.takeIf { it.isNotEmpty() }
        if (query != null && query.length > MAX_QUERY_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "q must not exceed $MAX_QUERY_LENGTH characters")
        }
        val now = Instant.now(clock)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id"))
        val result = users.searchForAdmin(query?.lowercase(), suspendedOnly, now, pageable)
        return AdminUsersPageResponse(
            content = result.content.map { it.toAdminResponse(now) },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    /** 가입 승인 대기 회원 목록. 오래 기다린 순(id 오름차순). */
    @Transactional(readOnly = true)
    fun getPendingUsers(page: Int, size: Int): AdminUsersPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val now = Instant.now(clock)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"))
        val result = users.findByApprovedAtIsNullAndDeletedAtIsNull(pageable)
        return AdminUsersPageResponse(
            content = result.content.map { it.toAdminResponse(now) },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    /** 가입 승인. 이후 해당 회원이 로그인할 수 있다. 이미 승인된 회원이면 무음으로 현재 상태를 돌려준다. */
    @Transactional
    fun approve(adminUserId: Long, userId: Long): AdminUserResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        val now = Instant.now(clock)
        if (user.isPendingApproval) {
            user.approvedAt = now
            actionLogs.record(adminUserId, AdminActionType.USER_APPROVED, TARGET_TYPE_USER, userId.toString())
        }
        return user.toAdminResponse(now)
    }

    /** 가입 거절. 계정을 soft delete 해 로그인/재사용을 막는다(같은 이메일 재가입은 가능). */
    @Transactional
    fun reject(adminUserId: Long, userId: Long): AdminUserResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (!user.isPendingApproval) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "user is not pending approval")
        }
        val now = Instant.now(clock)
        user.deletedAt = now
        // 탈퇴 익명화와 동일하게 이메일 unique 자리를 비워 같은 이메일로 재가입할 수 있게 한다.
        user.email = "rejected-${user.id}@deleted.local"
        actionLogs.record(adminUserId, AdminActionType.USER_REJECTED, TARGET_TYPE_USER, userId.toString())
        return user.toAdminResponse(now)
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    fun setSuspension(adminUserId: Long, userId: Long, request: SetUserSuspensionRequest): AdminUserResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        // 관리자 계정(본인 포함)은 이 API 로 정지할 수 없다. 실수로 전원이 잠기는 사고 방지.
        if (user.isAdmin) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot suspend an admin account")
        }
        val reason = request.reason?.trim()?.ifEmpty { null }
        if (reason != null && reason.length > MAX_REASON_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "reason must not exceed $MAX_REASON_LENGTH characters")
        }

        val now = Instant.now(clock)
        if (request.suspendedUntil == null) {
            // 실제로 정지 중이었던 경우에만 기록한다(이미 정상인 계정의 해제 재요청은 무음).
            val wasSuspended = user.isSuspendedAt(now)
            user.suspendedUntil = null
            user.suspendedReason = null
            if (wasSuspended) {
                actionLogs.record(adminUserId, AdminActionType.USER_UNSUSPENDED, TARGET_TYPE_USER, userId.toString())
            }
        } else {
            val until = try {
                Instant.parse(request.suspendedUntil)
            } catch (_: DateTimeParseException) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "suspendedUntil must be an ISO-8601 instant")
            }
            if (!until.isAfter(now)) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "suspendedUntil must be in the future")
            }
            user.suspendedUntil = until
            user.suspendedReason = reason
            actionLogs.record(
                adminUserId,
                AdminActionType.USER_SUSPENDED,
                TARGET_TYPE_USER,
                userId.toString(),
                detail = suspensionDetail(until, now, reason),
            )
        }
        return user.toAdminResponse(now)
    }

    /** 찬양팀 역할·파트 지정/해제. 사이트 role 과 독립 — 일반 회원도 찬양팀 멤버가 될 수 있다. */
    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    fun setPraiseRole(adminUserId: Long, userId: Long, request: SetPraiseRoleRequest): AdminUserResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        val role = request.praiseRole?.trim()?.takeIf { it.isNotEmpty() }?.let {
            runCatching { com.hanbit.api.auth.PraiseRole.valueOf(it) }.getOrElse {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "praiseRole must be LEADER/MEMBER/GUEST")
            }
        }
        val parts = request.praiseParts.map { part ->
            runCatching { com.hanbit.api.auth.PraisePart.valueOf(part.trim()) }.getOrElse {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid praise part: $part")
            }.name
        }.distinct()
        val newParts = if (role == null) emptyList() else parts
        val changed = user.praiseRole != role?.name || user.praiseParts.orEmpty() != newParts
        val previous = user.praiseRole ?: "없음"
        user.praiseRole = role?.name
        user.praiseParts = if (role == null) null else parts
        if (changed) {
            actionLogs.record(
                adminUserId,
                AdminActionType.PRAISE_ROLE_CHANGED,
                TARGET_TYPE_USER,
                userId.toString(),
                detail = "$previous → ${role?.name ?: "없음"}" +
                    (if (newParts.isNotEmpty()) " · ${newParts.joinToString(", ")}" else ""),
            )
        }
        return user.toAdminResponse(Instant.now(clock))
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    fun setRole(adminUserId: Long, userId: Long, request: SetUserRoleRequest): AdminUserResponse {
        val newRole = try {
            UserRole.valueOf(request.role.trim())
        } catch (_: IllegalArgumentException) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "role must be one of ${UserRole.entries.joinToString("/")}",
            )
        }
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        // 본인 역할은 바꿀 수 없다. 마지막 관리자가 스스로 강등해 전원이 잠기는 사고 방지.
        if (userId == adminUserId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot change own role")
        }
        val now = Instant.now(clock)
        val previousRole = user.role
        if (previousRole == newRole.name) return user.toAdminResponse(now)

        user.role = newRole.name
        // JwtAuthFilter 가 매 요청 DB role 을 읽으므로 승격/강등이 기존 토큰에도 즉시 반영된다.
        actionLogs.record(
            adminUserId,
            AdminActionType.ROLE_CHANGED,
            TARGET_TYPE_USER,
            userId.toString(),
            detail = "$previousRole → ${newRole.name}",
        )
        return user.toAdminResponse(now)
    }

    /**
     * 비밀번호 초기화 — 이메일 인프라 없이 쓰는 복구 경로. 임시 비밀번호를 생성해 응답으로 한 번만
     * 돌려주고(저장·로그 금지) 강제 변경 플래그를 세운다. 사용자는 다음 비밀번호 변경 때 해제된다.
     * 관리자 계정은 대상이 될 수 없다 — 다른 관리자의 계정을 이 API 로 탈취하는 경로를 막는다.
     */
    @Transactional
    fun resetPassword(adminUserId: Long, userId: Long): AdminPasswordResetResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.isAdmin) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot reset an admin account's password")
        }
        val tempPassword = generateTempPassword()
        user.passwordHash = encoder.encode(tempPassword)!!
        user.passwordResetRequired = true
        // 자격 증명이 교체됐으므로 대상의 기존 세션을 전부 해지한다 — 본인 비밀번호 변경(#87)과 동일
        // 정책이며, 탈취 대응으로 초기화하는 시나리오에서 공격자 세션이 살아남지 않게 한다.
        // currentSessionId=null: 대상 본인이 요청자가 아니므로 예외 없이 전부 끊는다. best-effort.
        // 실패해도 초기화 자체는 진행하되, 조용히 삼키지 않고 경고 로그를 남긴다 — 부분 해지(공격자
        // 세션 잔존 가능)가 "해지 0건"과 구분되지 않으면 운영이 인지하지 못한다.
        val revoked = runCatching { accessLogs.revokeOtherSessions(userId, currentSessionId = null).revokedCount }
            .getOrElse { e ->
                log.warn("관리자 비밀번호 초기화: 대상 {} 세션 해지 실패 — best-effort 로 진행", userId, e)
                0
            }
        // detail 에 임시 비밀번호를 남기지 않는다 — 감사 로그는 누가/누구를 만 기록한다.
        actionLogs.record(adminUserId, AdminActionType.PASSWORD_RESET, TARGET_TYPE_USER, userId.toString())
        return AdminPasswordResetResponse(userId = userId, tempPassword = tempPassword, revokedSessions = revoked)
    }

    /**
     * 2FA(TOTP) 해제 — 인증앱 분실 복구 경로. 분실 상태에선 로그인 자체가 불가해 본인 해제
     * (비밀번호 재확인) API 를 쓸 수 없다. 오프라인 본인 확인 후 관리자가 푼다.
     * 비밀번호 초기화와 같은 정책: 관리자 계정은 대상 불가(400), 이미 꺼져 있으면 무음 멱등.
     */
    @Transactional
    fun resetTwoFactor(adminUserId: Long, userId: Long): AdminUserResponse {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.deletedAt != null) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "user not found")
        }
        if (user.isAdmin) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "cannot reset an admin account's two-factor")
        }
        val now = Instant.now(clock)
        if (user.totpEnabled) {
            user.totpSecret = null
            user.totpEnabledAt = null
            actionLogs.record(adminUserId, AdminActionType.TWO_FACTOR_RESET, TARGET_TYPE_USER, userId.toString())
        }
        return user.toAdminResponse(now)
    }

    /** 혼동 문자(0/O, 1/l/I)를 뺀 영대소문자·숫자 12자리. SecureRandom 기반. */
    private fun generateTempPassword(): String =
        (1..TEMP_PASSWORD_LENGTH)
            .map { TEMP_PASSWORD_ALPHABET[SECURE_RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length)] }
            .joinToString("")

    /** 감사 로그용 정지 요약. AuthService 의 로그인 안내와 같은 기준(50년 초과 = 영구)으로 표기한다. */
    private fun suspensionDetail(until: Instant, now: Instant, reason: String?): String {
        val period = if (until.isAfter(now.plus(java.time.Duration.ofDays(365L * 50)))) {
            "영구 정지"
        } else {
            "${java.time.LocalDate.ofInstant(until, java.time.ZoneId.of("Asia/Seoul"))} 까지"
        }
        return if (reason != null) "$period · $reason" else period
    }

    private fun User.toAdminResponse(now: Instant): AdminUserResponse = AdminUserResponse(
        id = requireNotNull(id),
        email = email,
        name = name,
        verified = verified,
        role = role,
        deleted = deletedAt != null,
        suspended = isSuspendedAt(now),
        suspendedUntil = suspendedUntil?.takeIf { it.isAfter(now) }?.toString(),
        suspendedReason = suspendedReason?.takeIf { isSuspendedAt(now) },
        createdAt = createdAt?.toString(),
        postCount = posts.countByAuthorUserId(requireNotNull(id)),
        eventCount = events.countByAuthorUserId(requireNotNull(id)),
        twoFactorEnabled = totpEnabled,
        pendingApproval = isPendingApproval,
        praiseRole = praiseRole,
        praiseParts = praiseParts.orEmpty(),
    )

    private companion object {
        val SECURE_RANDOM = java.security.SecureRandom()
        const val TEMP_PASSWORD_LENGTH = 12
        const val TEMP_PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"
        const val TARGET_TYPE_USER = "USER"
        const val MAX_PAGE_SIZE = 100
        const val MAX_QUERY_LENGTH = 100
        const val MAX_REASON_LENGTH = 500
    }
}
