package com.hanbit.api.common

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/**
 * 공개 read API 의 조건부 GET(ETag/304) 검증. 본문 해시 ETag 발급 →
 * If-None-Match 재검증 시 304(본문 없음) → 캐시 지시는 private, no-cache.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EtagCachingTest(
    @param:Autowired private val mvc: MockMvc,
) {
    @Test
    fun `공개 목록 GET 은 ETag 를 발급하고 If-None-Match 재검증에 304 로 응답한다`() {
        val first = mvc.get("/api/events").andExpect { status { isOk() } }.andReturn().response
        val etag = first.getHeader("ETag")
        assertThat(etag).isNotBlank()
        assertThat(first.getHeader("Cache-Control")).isEqualTo("private, no-cache")

        val second = mvc.get("/api/events") { header("If-None-Match", etag!!) }
            .andExpect { status { isNotModified() } }
            .andReturn().response
        assertThat(second.contentAsString).isEmpty()
        assertThat(second.getHeader("ETag")).isEqualTo(etag)
    }

    @Test
    fun `공개 캘린더 GET 도 ETag 재검증이 동작한다`() {
        val etag = mvc.get("/api/calendar") { param("from", "2026-07-01"); param("to", "2026-07-31") }
            .andExpect { status { isOk() } }
            .andReturn().response.getHeader("ETag")
        assertThat(etag).isNotBlank()
        mvc.get("/api/calendar") {
            param("from", "2026-07-01"); param("to", "2026-07-31")
            header("If-None-Match", etag!!)
        }.andExpect { status { isNotModified() } }
    }

    @Test
    fun `ETag 대상 밖 경로(auth)는 캐시 지시가 붙지 않는다`() {
        val response = mvc.get("/api/auth/me").andReturn().response
        assertThat(response.getHeader("ETag")).isNull()
        assertThat(response.getHeader("Cache-Control")).isNotEqualTo("private, no-cache")
    }
}
