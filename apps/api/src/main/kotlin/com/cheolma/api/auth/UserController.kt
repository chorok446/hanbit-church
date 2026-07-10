package com.cheolma.api.auth

import com.cheolma.api.post.PostPageResponse
import com.cheolma.api.post.PostService
import com.cheolma.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/** HTTP adapter. 공개 프로필·사용자 검색·차단 API. */
@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "공개 사용자 프로필·검색·차단 API")
class UserController(
    private val userProfileService: UserProfileService,
    private val userBlockService: UserBlockService,
    private val postService: PostService,
) {
    @Operation(summary = "사용자 검색", description = "공개 API. 이름 부분 일치로 검색하며, JWT 가 있으면 차단 상태를 포함한다.")
    @GetMapping("/search")
    fun search(
        @RequestParam(defaultValue = "") q: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @AuthenticationPrincipal user: AuthUser?,
    ): PublicUserPageResponse = userProfileService.searchUsers(q, user?.id, page, size)

    @Operation(summary = "공개 프로필 조회", description = "이메일 등 민감 정보는 포함하지 않는다.")
    @GetMapping("/{id}")
    fun profile(
        @PathVariable id: Long,
        @AuthenticationPrincipal user: AuthUser?,
    ): PublicUserResponse = userProfileService.getPublicProfile(id, user?.id)

    @Operation(summary = "사용자 게시글 목록", description = "공개 API. JWT 가 있으면 좋아요/북마크 상태를 포함한다.")
    @GetMapping("/{id}/posts")
    fun posts(
        @PathVariable id: Long,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @AuthenticationPrincipal user: AuthUser?,
    ): PostPageResponse = postService.getPostsByAuthorPage(id, user?.id, page, size)

    @Operation(summary = "사용자 차단")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun block(@PathVariable id: Long, @AuthenticationPrincipal user: AuthUser) {
        userBlockService.block(user.id, id)
    }

    @Operation(summary = "사용자 차단 해제")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}/block")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun unblock(@PathVariable id: Long, @AuthenticationPrincipal user: AuthUser) {
        userBlockService.unblock(user.id, id)
    }
}
