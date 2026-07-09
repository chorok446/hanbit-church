package com.dasida.api.media

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * /uploads 정적 서빙 보안 헤더. 업로드 파일이 브라우저에서 문서로 렌더되는 것을 막는다.
 * - 전체: X-Content-Type-Options: nosniff (MIME 스니핑 차단)
 * - 이미지(게시글·프로필 <img> 용)를 제외한 나머지는 Content-Disposition: attachment 로 다운로드 강제
 *   — 확장자 denylist 를 우회한 파일이 있어도 same-origin 문서로 실행되지 않는다.
 */
@Component
class UploadSecurityHeadersFilter : OncePerRequestFilter() {
    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        !request.requestURI.startsWith("/uploads/")

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        res.setHeader("X-Content-Type-Options", "nosniff")
        val ext = req.requestURI.substringAfterLast('.', "").lowercase()
        if (ext !in INLINE_IMAGE_EXTENSIONS) {
            res.setHeader("Content-Disposition", "attachment")
        }
        chain.doFilter(req, res)
    }

    private companion object {
        // MediaUploadService.store 가 만드는 이미지·썸네일 확장자만 인라인 허용.
        val INLINE_IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp")
    }
}
