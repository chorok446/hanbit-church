package com.hanbit.api.security

import org.junit.jupiter.api.Test
import java.io.File

/**
 * Actuator 노출 기본값 회귀 가드 — main `application.properties` 의 exposure **기본값**에 prometheus 가
 * 들어있지 않은지(=기본 비공개, 스크레이프 환경만 MANAGEMENT_ENDPOINTS 로 opt-in) 소스 자체를 검사한다.
 *
 * 왜 런타임(@SpringBootTest)이 아니라 소스 검사인가: 테스트 리소스(src/test/resources/application.properties)가
 * exposure 를 health,prometheus 로 override 해 main 기본값을 가리므로, 런타임 테스트로는 "실제 배포 기본값"을
 * 검증할 수 없다(어떤 @TestPropertySource 도 main 값이 아니라 자기가 강제한 값을 볼 뿐 — tautology).
 * 그래서 배포되는 설정 파일의 기본값 문자열을 직접 확인해 "기본에 prometheus 재노출" 회귀를 잡는다.
 */
class ActuatorPrometheusDefaultTest {
    @Test
    fun `main actuator 노출 기본값에 prometheus 가 없다 - 기본 비공개`() {
        val line = File("src/main/resources/application.properties").readLines()
            .firstOrNull { it.trimStart().startsWith("management.endpoints.web.exposure.include=") }
            ?: error("application.properties 에서 actuator exposure 설정 라인을 찾지 못했습니다")
        // 예: management.endpoints.web.exposure.include=${MANAGEMENT_ENDPOINTS:health}
        // '=' 뒤(기본값·env 표현식)에 prometheus 가 있으면 스크레이프 opt-in 없이도 앱 포트에 노출되는 회귀다.
        val rhs = line.substringAfter("=")
        assert(!rhs.contains("prometheus")) {
            "prometheus 는 기본 노출에서 빠져 있어야 한다(MANAGEMENT_ENDPOINTS env 로만 opt-in): $line"
        }
    }
}
