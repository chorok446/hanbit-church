package com.hanbit.api.auth

import com.hanbit.api.common.checkPageParams
import com.hanbit.api.post.PostRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant

/** 공개 사용자 프로필·검색. (팔로우·DM 기능은 제거됨.) */
@Service
class UserProfileService(
    private val users: UserRepository,
    private val posts: PostRepository,
    private val authService: AuthService,
    private val userBlocks: UserBlockService,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun getPublicProfile(userId: Long, viewerId: Long?): PublicUserResponse {
        val user = authService.publicUser(userId)
        return toPublicUser(user, viewerId)
    }

    @Transactional(readOnly = true)
    fun searchUsers(q: String, viewerId: Long?, page: Int, size: Int): PublicUserPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val query = q.trim()
        if (query.length > MAX_QUERY_LENGTH) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "q must not exceed $MAX_QUERY_LENGTH characters")
        }
        // 빈 검색어로 전체 회원을 나열하지 않는다.
        if (query.isEmpty()) {
            return PublicUserPageResponse(content = emptyList(), page = page, size = size, totalElements = 0, totalPages = 0)
        }
        val result = users.searchPublic(
            query.lowercase(),
            Instant.now(clock),
            PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")),
        )
        return PublicUserPageResponse(
            content = result.content.map { toPublicUser(it, viewerId) },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
        )
    }

    private fun toPublicUser(user: User, viewerId: Long?): PublicUserResponse {
        val id = requireNotNull(user.id)
        return PublicUserResponse(
            id = id,
            name = user.name,
            verified = user.verified,
            profileImageUrl = user.profileImageUrl,
            postCount = posts.countByAuthorUserIdAndAnonymousFalse(id), // 익명 기도제목 제외(공개 수치)
            blockedByMe = viewerId?.let { userBlocks.isBlockedBy(it, id) },
        )
    }

    private companion object {
        const val MAX_PAGE_SIZE = 100
        const val MAX_QUERY_LENGTH = 100
    }
}
