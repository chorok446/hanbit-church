package com.cheolma.api.common

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.Ordered
import org.springframework.web.filter.ShallowEtagHeaderFilter

/**
 * 공개 read API 의 조건부 GET 캐싱(ETag/304). 응답 본문 해시를 ETag 로 내려주고,
 * 클라이언트가 If-None-Match 로 재검증하면 본문 없이 304 로 응답한다 — gzip 과 조합되어
 * 재방문 목록/상세 조회의 전송량을 줄인다(서버 연산은 그대로 — 뷰 카운트 등 부수효과 유지).
 *
 * Cache-Control 은 `private, no-cache`: 공유 캐시 저장 금지(likedByMe 등 뷰어별 필드),
 * 매 요청 재검증(no-cache ≠ no-store — ETag 재검증과 정확히 맞는 의미).
 */
@Configuration
class HttpCacheConfig {
    @Bean
    fun publicGetEtagFilter(): FilterRegistrationBean<PublicGetEtagFilter> {
        val registration = FilterRegistrationBean(PublicGetEtagFilter())
        // 공개 read 도메인만. 개인화 GET(mine/bookmarks)도 같은 경로 아래 있지만
        // ETag 는 본문 해시라 사용자별로 달라 안전하고, private 지시로 공유 캐시도 차단된다.
        // media(대용량 바이너리)·notifications(상시 변경)·actuator 는 제외.
        registration.addUrlPatterns(
            "/api/posts", "/api/posts/*",
            "/api/events", "/api/events/*",
            "/api/calendar", "/api/calendar/*",
            "/api/users", "/api/users/*",
        )
        // 보안·rate limit 필터 안쪽(최후순)에서 컨트롤러 출력만 버퍼링한다.
        registration.order = Ordered.LOWEST_PRECEDENCE
        return registration
    }
}

class PublicGetEtagFilter : ShallowEtagHeaderFilter() {
    // GET 외에는 응답 버퍼링 자체를 건너뛴다(ETag 는 어차피 GET 에만 생성됨).
    override fun shouldNotFilter(request: HttpServletRequest): Boolean = request.method != "GET"

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain,
    ) {
        response.setHeader("Cache-Control", "private, no-cache")
        super.doFilterInternal(request, response, filterChain)
    }
}
