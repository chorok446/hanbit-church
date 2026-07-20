package com.hanbit.api.media

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse

/**
 * /uploads 보안 헤더 회귀 가드. PDF 는 주보 인라인 뷰어를 위해 inline, 그 외 문서는 다운로드 강제,
 * 이미지는 disposition 미설정(브라우저 기본 inline). 어느 경로든 nosniff.
 */
class UploadSecurityHeadersFilterTest {
    private val filter = UploadSecurityHeadersFilter()

    private fun dispositionFor(uri: String): String? {
        val res = MockHttpServletResponse()
        filter.doFilter(MockHttpServletRequest("GET", uri), res, MockFilterChain())
        assertThat(res.getHeader("X-Content-Type-Options")).isEqualTo("nosniff")
        return res.getHeader("Content-Disposition")
    }

    @Test
    fun `pdf 는 인라인으로 서빙된다`() {
        assertThat(dispositionFor("/uploads/abc.pdf")).isEqualTo("inline")
    }

    @Test
    fun `이미지는 disposition 을 강제하지 않는다`() {
        for (ext in listOf("jpg", "jpeg", "png", "webp")) {
            assertThat(dispositionFor("/uploads/abc.$ext")).isNull()
        }
    }

    @Test
    fun `그 외 문서는 다운로드로 강제된다`() {
        for (ext in listOf("hwp", "txt", "bin", "docx")) {
            assertThat(dispositionFor("/uploads/abc.$ext")).isEqualTo("attachment")
        }
    }
}
