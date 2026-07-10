package com.cheolma.api.auth

import tools.jackson.databind.json.JsonMapper
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.UnexpectedRollbackException
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 접속 기록은 best-effort 다 — 기록(INSERT)이나 보존기간 삭제가 실패해도 로그인은 성공해야 한다.
 * 실제 장애 사례: e2e 병렬 실행에서 동시 로그인 시 보존기간 범위 DELETE(갭 락) ↔ INSERT 데드락이
 * 트랜잭션을 rollback-only 로 마킹 → 커밋 시 UnexpectedRollbackException → 로그인 500.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(AccessLogBestEffortTest.FailingAccessLogWriterConfig::class)
class AccessLogBestEffortTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val repo: UserRepository,
    @param:Autowired val objectMapper: JsonMapper,
    @param:Autowired val passwordEncoder: PasswordEncoder,
) {

    // 익명 클래스는 final 이라 CGLIB(@Transactional 프록시)이 못 감싼다 — named open class 로 선언.
    open class FailingAccessLogWriter(repo: UserAccessLogRepository) : AccessLogWriter(repo) {
        override fun write(
            userId: Long,
            ip: String,
            info: com.cheolma.api.common.ClientRequestInfo,
            geo: GeoLocation?,
            now: Instant,
        ): Unit = throw UnexpectedRollbackException("simulated deadlock rollback-only")

        override fun pruneOlderThanRetention(now: Instant): Unit =
            throw UnexpectedRollbackException("simulated deadlock rollback-only")
    }

    @TestConfiguration
    class FailingAccessLogWriterConfig {
        @Bean
        @Primary
        fun failingAccessLogWriter(accessLogRepo: UserAccessLogRepository): AccessLogWriter =
            FailingAccessLogWriter(accessLogRepo)
    }

    @Test
    fun `접속 기록 쓰기와 보존기간 삭제가 실패해도 로그인은 200 이다`() {
        val password = "Current1!"
        repo.saveAndFlush(
            User(
                email = "accesslog-fail@cheolma.com",
                passwordHash = passwordEncoder.encode(password)!!,
                name = "접속기록실패",
                approvedAt = Instant.now(),
            ),
        )

        mvc.post("/api/auth/login") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(LoginRequest("accesslog-fail@cheolma.com", password))
        }.andExpect { status { isOk() } }
    }
}
