package com.hanbit.api.auth

import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "users")
class User(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long? = null,
    @Column(unique = true) var email: String,
    @JsonIgnore var passwordHash: String,
    var name: String,
    val verified: Boolean = false,
    @Column(name = "profile_image_url", length = 500) var profileImageUrl: String? = null,
    @Column(name = "notify_event_updates", nullable = false) var notifyEventUpdates: Boolean = true,
    // 알림 유형별 수신 설정. 보안(새 기기 로그인)·운영(숨김/신고 처리) 알림은 설정과 무관하게 전달된다.
    @Column(name = "notify_comments", nullable = false) var notifyComments: Boolean = true,
    @Column(name = "notify_likes", nullable = false) var notifyLikes: Boolean = true,
    // 관리자 비밀번호 초기화 후 강제 변경 대기. 비밀번호 변경 성공 시 해제된다.
    @Column(name = "password_reset_required", nullable = false) @JsonIgnore var passwordResetRequired: Boolean = false,
    @Column(name = "deleted_at") @JsonIgnore var deletedAt: Instant? = null,
    // Report.targetType 과 같은 패턴: enum name 을 String 컬럼에 저장(UserRole 참조).
    @Column(nullable = false, length = 20) var role: String = UserRole.USER.name,
    // 관리자 제재. null 또는 과거 = 정상, 미래 = 정지 중(로그인·기존 토큰 모두 차단).
    @Column(name = "suspended_until") @JsonIgnore var suspendedUntil: Instant? = null,
    @Column(name = "suspended_reason", length = 500) @JsonIgnore var suspendedReason: String? = null,
    // 가입 시각. V12 이전 가입자는 null(가입 시점을 알 수 없음).
    @Column(name = "created_at") val createdAt: Instant? = null,
    // 가입 승인 시각. null = 관리자 승인 대기(로그인 불가). 기존 사용자는 V19 마이그레이션이 backfill.
    // 엔티티 직접 생성(테스트·시드)은 기본 승인 — 승인 대기는 회원가입 경로에서만 만들어진다.
    @Column(name = "approved_at") @JsonIgnore var approvedAt: Instant? = Instant.EPOCH,
    // 2단계 인증(TOTP). secret 은 등록 시 저장되고 enabledAt 이 채워져야 활성 — null = 미사용/등록 중.
    @Column(name = "totp_secret", length = 64) @JsonIgnore var totpSecret: String? = null,
    @Column(name = "totp_enabled_at") @JsonIgnore var totpEnabledAt: Instant? = null,
    // 찬양팀 역할(PraiseRole: LEADER/MEMBER/GUEST). 사이트 role 과 분리 — null = 찬양팀 아님.
    @Column(name = "praise_role", length = 20) var praiseRole: String? = null,
    // 찬양팀 파트(복수). 예: ["VOCAL","KEYBOARD"]. PraisePart 참조.
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "praise_parts", columnDefinition = "json")
    var praiseParts: List<String>? = null,
) {
    val isAdmin: Boolean
        @JsonIgnore get() = role == UserRole.ADMIN.name

    val isPendingApproval: Boolean
        @JsonIgnore get() = approvedAt == null

    fun isSuspendedAt(now: Instant): Boolean = suspendedUntil?.isAfter(now) == true

    val totpEnabled: Boolean
        @JsonIgnore get() = totpSecret != null && totpEnabledAt != null
}

/**
 * 사용자 역할. 단일 역할 체계(users.role 문자열 컬럼).
 * - ADMIN: 최고 관리자 — 전체 + 감사 로그 + 회원 정지·역할 변경
 * - OPERATOR: 운영자 — 신고·회원 조회·가입 승인·콘텐츠(공지·주보) 관리
 * - MINISTRY: 사역 담당자 — 행사·사역 개설/관리
 * - NEW_FAMILY: 새가족 담당자 — 새가족 신청 관리
 * - CONTENT: 콘텐츠 관리자 — 공지·주보·설교 작성
 * 경로별 접근 매핑은 SecurityConfig, 카테고리 권한은 PostService 참조.
 */
/** 찬양팀 역할. 권한 변경은 감사 로그(AdminActionType.PRAISE_ROLE_CHANGED)에 남는다. */
enum class PraiseRole { LEADER, MEMBER, GUEST }

/** 찬양팀 파트(복수 보유 가능). */
enum class PraisePart { LEADER, VOCAL, KEYBOARD, ELECTRIC_GUITAR, ACOUSTIC_GUITAR, BASS, DRUMS, SOUND, MEDIA, LYRICS }

enum class UserRole {
    USER,
    ADMIN,
    OPERATOR,
    MINISTRY,
    NEW_FAMILY,
    CONTENT,
    ;

    companion object {
        /** 관리자 화면(/admin)에 들어올 수 있는 스태프 역할. */
        val STAFF = setOf(ADMIN, OPERATOR, MINISTRY, NEW_FAMILY, CONTENT)
    }
}
