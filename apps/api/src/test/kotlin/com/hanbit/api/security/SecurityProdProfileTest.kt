package com.hanbit.api.security

import com.hanbit.api.auth.User
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

/**
 * prod 프로파일 전용 잠금 검증 — env 설정 기억이 아니라 코드로 강제되는 정책들.
 * 행사 개설 스태프 제한 강제. (Swagger/OpenAPI 봉인은 OpenApiProdProfileTest 가 담당.)
 */
@SpringBootTest(
    properties = [
        "app.jwt.secret=test-prod-secret-that-is-long-enough-for-tests-1234567890",
        "app.cors.allowed-origins=https://app.example.com",
        "spring.data.redis.host=localhost",
        "management.health.redis.enabled=false",
        // 테스트 환경에는 Redis 가 없다 — prod 의 redis denylist 는 fail-closed 라 모든 인증이 401 이
        // 되므로, 이 테스트 주제(인가 매처)와 무관한 store 만 memory 로 되돌린다.
        "app.auth.denylist.store=memory",
    ],
)
@AutoConfigureMockMvc
@ActiveProfiles("prod")
@Transactional
class SecurityProdProfileTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: com.hanbit.api.auth.UserRepository,
) {
    @Test
    fun `prod 에서는 플래그와 무관하게 일반 회원의 행사 개설이 403`() {
        // prod 컨텍스트에는 테스트 시드가 없으므로 회원을 직접 저장한다(JwtAuthFilter 가 DB 존재를 검증).
        val user = users.saveAndFlush(User(email = "prod-user@hanbit.com", passwordHash = "h", name = "일반회원"))
        val token = jwt.issue(user)
        mvc.post("/api/events") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"테스트 행사"}"""
        }.andExpect { status { isForbidden() } }
    }
}
