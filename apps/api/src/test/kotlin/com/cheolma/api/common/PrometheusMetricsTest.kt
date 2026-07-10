package com.cheolma.api.common

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/**
 * Prometheus 메트릭 endpoint smoke test. 인증 없이 노출되는지(로컬 스크레이프),
 * JVM 기본 메트릭과 application 공통 태그가 실리는지 확인한다.
 * 공개 배포에서는 MANAGEMENT_ENDPOINTS=health 로 endpoint 자체를 내린다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PrometheusMetricsTest(
    @param:Autowired private val mvc: MockMvc,
) {
    @Test
    fun `prometheus endpoint 는 인증 없이 JVM 메트릭과 application 태그를 노출한다`() {
        val body = mvc.get("/actuator/prometheus")
            .andExpect { status { isOk() } }
            .andReturn().response.contentAsString
        assert(body.contains("jvm_memory_used_bytes")) { "JVM 메트릭 누락" }
        assert(body.contains("application=\"cheolma-api\"")) { "application 공통 태그 누락" }
    }

    @Test
    fun `민감 actuator endpoint(env)는 노출되지 않는다`() {
        // 미노출 endpoint 는 보안 체인에 걸려 401 또는 404 — 성공(2xx)만 아니면 된다.
        mvc.get("/actuator/env").andExpect { status { is4xxClientError() } }
    }
}
