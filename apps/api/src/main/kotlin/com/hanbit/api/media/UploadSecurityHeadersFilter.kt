package com.hanbit.api.media

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * /uploads 정적 서빙 보안 헤더. 업로드 파일이 브라우저에서 문서로 렌더되는 것을 막는다.
 * - 전체: X-Content-Type-Options: nosniff (MIME 스니핑 차단)
 * - 이미지(게시글·프로필 <img> 용)와 PDF(주보 인라인 뷰어 용)는 Content-Disposition: inline 허용
 * - 그 외는 Content-Disposition: attachment 로 다운로드 강제
 *   — 확장자 denylist 를 우회한 파일이 있어도 same-origin 문서로 실행되지 않는다.
 *
 * PDF 인라인 안전성: (1) storeDocument 가 업로드 시 HTML/스크립트/SVG 등 실행형 마크업 내용을
 * 차단(looksLikeExecutableMarkup)하므로 .pdf 로 위장한 HTML 이 저장되지 않고, (2) nosniff 로
 * 브라우저가 pdf 응답을 HTML 로 스니핑하지 못하며, (3) 브라우저 내장 PDF 뷰어는 PDF 내부 JS 를
 * 오리진과 격리 실행한다. 세 겹으로 인라인 렌더가 안전하다.
 */
@Component
class UploadSecurityHeadersFilter : OncePerRequestFilter() {
    override fun shouldNotFilter(request: HttpServletRequest): Boolean =
        !request.requestURI.startsWith("/uploads/")

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        res.setHeader("X-Content-Type-Options", "nosniff")
        val ext = req.requestURI.substringAfterLast('.', "").lowercase()
        when (ext) {
            in INLINE_IMAGE_EXTENSIONS -> {} // 이미지: <img> 인라인 — Content-Disposition 미설정(브라우저 기본 inline)
            "pdf" -> res.setHeader("Content-Disposition", "inline") // 주보 PDF 인라인 뷰어
            else -> res.setHeader("Content-Disposition", "attachment")
        }
        chain.doFilter(req, res)
    }

    private companion object {
        // MediaUploadService.store 가 만드는 이미지·썸네일 확장자만 인라인 허용.
        val INLINE_IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp")
    }
}
