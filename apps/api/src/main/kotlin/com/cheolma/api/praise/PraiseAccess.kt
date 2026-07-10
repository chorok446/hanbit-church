package com.cheolma.api.praise

import com.cheolma.api.auth.PraiseRole
import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException

/**
 * 찬양팀 권한 판정 공용 컴포넌트(PraiseService/PraiseScheduleService 공유).
 * JwtAuthFilter 는 사이트 role 만 authority 로 부여하므로, 찬양팀 권한은
 * 매 요청 users.praise_role 을 DB 조회해 검사한다(권한 회수 즉시 반영).
 */
@Component
class PraiseAccess(
    private val users: UserRepository,
) {
    /** 찬양팀 역할 보유자(LEADER/MEMBER/GUEST) 또는 사이트 ADMIN. 아니면 403. */
    fun requireMember(userId: Long): User {
        val user = users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.FORBIDDEN, "praise team members only")
        }
        if (user.praiseRole == null && !user.isAdmin) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "praise team members only")
        }
        return user
    }

    /** 찬양팀 LEADER 또는 사이트 ADMIN. 아니면 403. */
    fun requireLeader(userId: Long): User {
        val user = requireMember(userId)
        if (user.praiseRole != PraiseRole.LEADER.name && !user.isAdmin) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "praise team leader only")
        }
        return user
    }

    /**
     * 콘티·일정을 수정/삭제할 권한. 작성자 본인(LEADER) 또는 사이트 ADMIN 만 허용한다.
     * 리더 권한만으로 남이 만든 콘티를 손대는 것을 막는다(IDOR 방지).
     */
    fun requireOwnerOrAdmin(userId: Long, ownerUserId: Long?): User {
        val user = requireLeader(userId)
        if (!user.isAdmin && ownerUserId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "only the creator or an admin can modify this")
        }
        return user
    }

    /** 멤버 여부만 조용히 판정(공개 캘린더 층 결정용 — 403 던지지 않는다). */
    fun isMember(userId: Long?): Boolean {
        if (userId == null) return false
        val user = users.findById(userId).orElse(null) ?: return false
        return user.praiseRole != null || user.isAdmin
    }
}
