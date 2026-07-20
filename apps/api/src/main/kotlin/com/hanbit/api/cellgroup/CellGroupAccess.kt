package com.hanbit.api.cellgroup

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException

/**
 * 목장 권한 판정. 찬양팀(PraiseAccess)과 달리 "그룹별" 리더/멤버라 그룹 컨텍스트를 받는다.
 * 사이트 role 은 JwtAuthFilter 가 authority 로 부여하지만, 회수 즉시 반영을 위해 DB 를 조회한다.
 * - 매니저(그룹·로스터 관리): 사역 스태프 ADMIN/OPERATOR/MINISTRY
 * - 그룹 리더(정보 수정·모임/기록): 그룹 leaderUserId 본인 또는 매니저
 * - 그룹 멤버(조회): 로스터 소속·리더 또는 매니저
 */
@Component
class CellGroupAccess(
    private val users: UserRepository,
    private val members: CellGroupMemberRepository,
) {
    /** 사역 스태프 여부(그룹·로스터를 관리할 수 있는 매니저). */
    fun isManager(user: User): Boolean = user.role in MANAGER_ROLES

    private fun loadUser(userId: Long): User =
        users.findById(userId).orElseThrow {
            ResponseStatusException(HttpStatus.FORBIDDEN, "forbidden")
        }

    /** 매니저(ADMIN/OPERATOR/MINISTRY)만. 그룹 생성·삭제·로스터 관리에 필요. */
    fun requireManager(userId: Long): User {
        val user = loadUser(userId)
        if (!isManager(user)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "cell group managers only")
        }
        return user
    }

    /** 그룹 리더 본인 또는 매니저. 정보 수정·모임 CRUD·기록에 필요. */
    fun requireGroupLeader(userId: Long, group: CellGroup): User {
        val user = loadUser(userId)
        if (isManager(user) || group.leaderUserId == userId) return user
        throw ResponseStatusException(HttpStatus.FORBIDDEN, "cell group leader only")
    }

    /** 그룹 멤버(로스터 소속)·리더·매니저. 상세·모임 조회에 필요. */
    fun requireGroupMember(userId: Long, group: CellGroup): User {
        val user = loadUser(userId)
        if (isManager(user) || group.leaderUserId == userId) return user
        if (members.existsByCellGroupIdAndUserId(group.id, userId)) return user
        throw ResponseStatusException(HttpStatus.FORBIDDEN, "cell group members only")
    }

    private companion object {
        val MANAGER_ROLES = setOf(UserRole.ADMIN.name, UserRole.OPERATOR.name, UserRole.MINISTRY.name)
    }
}
