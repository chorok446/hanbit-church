package com.hanbit.api.common.ratelimit

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.HttpMethod
import org.springframework.stereotype.Component

@Component
class ContentWriteRateLimitFilter(
    rateLimitService: RateLimitService,
) : RateLimitFilterBase(rateLimitService) {
    override fun ruleFor(request: HttpServletRequest): RateLimitRule? {
        if (request.method != HttpMethod.POST.name()) return null
        val path = request.requestURI.removeSuffix("/")
        if (path == "/api/reports") return RateLimitRule.REPORT_CREATE
        // 새가족 등록은 비로그인 공개 POST — 신고와 같은 IP 한도를 공유한다.
        if (path == "/api/new-family") return RateLimitRule.REPORT_CREATE
        if (path == "/api/media" || path == "/api/media/document") return RateLimitRule.MEDIA_UPLOAD
        // 찬양팀 파일 업로드도 디스크에 파일을 쓰므로 미디어 업로드 한도를 공유한다.
        if (path == "/api/praise/files") return RateLimitRule.MEDIA_UPLOAD
        // 게시글·행사 본문 생성(2-세그먼트 POST). 댓글/상호작용(4-세그먼트)과 겹치지 않는다.
        if (path == "/api/posts" || path == "/api/events") return RateLimitRule.CONTENT_CREATE
        if (isCommentCreatePath(path)) return RateLimitRule.COMMENT_CREATE
        if (isInteractionPath(path)) return RateLimitRule.INTERACTION_TOGGLE
        return null
    }

    /** 좋아요·북마크·참여·차단 토글 POST. 알림을 만들 수 있는 가벼운 상호작용을 하나의 한도로 묶는다.
     * (조회수는 상세 GET 에서 집계하는 구조라 별도 규칙이 필요 없다. 팔로우는 이 포크에서 제거됨.) */
    private fun isInteractionPath(path: String): Boolean {
        val segments = path.split("/").filter { it.isNotEmpty() }
        return segments.size == 4 && segments[0] == "api" && (
            (segments[1] in setOf("posts", "events") && segments[3] in setOf("like", "bookmark", "join")) ||
                (segments[1] == "users" && segments[3] == "block")
            )
    }

    private fun isCommentCreatePath(path: String): Boolean {
        val segments = path.split("/").filter { it.isNotEmpty() }
        if (segments.size != 4) return false
        return segments[0] == "api" &&
            segments[1] in setOf("posts", "events") &&
            // 참여 후기(proofs)도 댓글과 같은 작성 한도를 공유한다.
            segments[3] in setOf("comments", "proofs")
    }
}
