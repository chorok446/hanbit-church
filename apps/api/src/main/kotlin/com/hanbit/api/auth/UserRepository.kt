package com.hanbit.api.auth

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

interface UserRepository : JpaRepository<User, Long> {
    fun findByEmail(email: String): User?
    fun existsByEmail(email: String): Boolean
    fun countByDeletedAtIsNull(): Long

    // 관리자 대시보드 "활동 회원" — 승인 대기 계정은 세지 않는다(전용 가입 승인 목록에서 관리).
    fun countByDeletedAtIsNullAndApprovedAtIsNotNull(): Long
    fun countBySuspendedUntilAfter(now: java.time.Instant): Long

    // 댓글 @멘션 해석용. 이름 정확 일치, 탈퇴 사용자는 제외한다.
    fun findByNameInAndDeletedAtIsNull(names: Collection<String>): List<User>

    // 찬양팀 팀원 목록(PraiseService). 정렬(역할→이름)은 서비스에서 처리한다.
    fun findByPraiseRoleIsNotNullAndDeletedAtIsNull(): List<User>

    // 관리자 통계용. 기간 내 가입 시각만 가져와 일 단위로 집계한다(탈퇴자 포함 — 가입 추이 관점).
    @org.springframework.data.jpa.repository.Query("select u.createdAt from User u where u.createdAt >= :since")
    fun signupTimesSince(since: java.time.Instant): List<java.time.Instant>

    // 관리자 회원 검색. q(소문자, 이메일/이름 부분 일치)와 정지 중 필터를 한 쿼리로 처리한다.
    // 승인 대기(approvedAt is null) 계정은 전용 "가입 승인" 목록에서만 다루므로 여기서는 제외한다.
    @org.springframework.data.jpa.repository.Query(
        """select u from User u
           where u.approvedAt is not null
           and (:q is null or lower(u.email) like concat('%', :q, '%') or lower(u.name) like concat('%', :q, '%'))
           and (:suspendedOnly = false or (u.suspendedUntil is not null and u.suspendedUntil > :now))""",
    )
    fun searchForAdmin(
        q: String?,
        suspendedOnly: Boolean,
        now: java.time.Instant,
        pageable: org.springframework.data.domain.Pageable,
    ): org.springframework.data.domain.Page<User>

    // 가입 승인 대기 목록(관리자). 오래 기다린 순(가입 순)으로 보여준다.
    fun findByApprovedAtIsNullAndDeletedAtIsNull(
        pageable: org.springframework.data.domain.Pageable,
    ): org.springframework.data.domain.Page<User>

    fun countByApprovedAtIsNullAndDeletedAtIsNull(): Long

    // 공개 사용자 검색. 이름 부분 일치(q 는 소문자), 탈퇴·정지 중 사용자는 제외한다.
    @org.springframework.data.jpa.repository.Query(
        """select u from User u
           where u.deletedAt is null
           and (u.suspendedUntil is null or u.suspendedUntil <= :now)
           and lower(u.name) like concat('%', :q, '%')""",
    )
    fun searchPublic(
        q: String,
        now: java.time.Instant,
        pageable: org.springframework.data.domain.Pageable,
    ): org.springframework.data.domain.Page<User>
}

/** DB 최신 사용자. 존재하지 않거나 탈퇴(deletedAt != null)한 사용자는 인증 실패로 처리한다. */
fun UserRepository.findActiveOrThrow(userId: Long): User {
    val user = findById(userId).orElseThrow {
        ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found")
    }
    if (user.deletedAt != null) {
        throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "user not found")
    }
    return user
}
