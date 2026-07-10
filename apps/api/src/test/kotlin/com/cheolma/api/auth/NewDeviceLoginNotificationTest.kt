package com.cheolma.api.auth

import com.cheolma.api.notification.NotificationRepository
import com.cheolma.api.notification.NotificationType
import tools.jackson.databind.json.JsonMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

/**
 * 새 기기 로그인 알림: 접속 기록이 있는 사용자가 처음 보는 (IP, 브라우저) 조합으로 로그인하면
 * NEW_DEVICE_LOGIN 알림을 받는다. 첫 로그인(이력 없음)과 같은 기기 재로그인은 무음.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NewDeviceLoginNotificationTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val notifications: NotificationRepository,
    @param:Autowired val objectMapper: JsonMapper,
    @param:Autowired val passwordEncoder: PasswordEncoder,
) {
    private fun saveUser(email: String, password: String): User = users.saveAndFlush(
        User(email = email, passwordHash = passwordEncoder.encode(password)!!, name = "기기테스트"),
    )

    private fun login(email: String, password: String, userAgent: String) = mvc.post("/api/auth/login") {
        contentType = MediaType.APPLICATION_JSON
        header("User-Agent", userAgent)
        content = objectMapper.writeValueAsString(LoginRequest(email, password))
    }

    private fun newDeviceCount(userId: Long): Long =
        notifications.findAll().count { it.userId == userId && it.type == NotificationType.NEW_DEVICE_LOGIN }.toLong()

    private val chromeMac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
    private val safariIphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"

    @Test
    fun `첫 로그인은 무음이고 새 브라우저 로그인부터 알림이 온다`() {
        val password = "Device1!"
        val user = saveUser("device-test@cheolma.com", password)
        val userId = requireNotNull(user.id)

        // 첫 로그인 — 접속 이력이 없으므로 알림 없음.
        login("device-test@cheolma.com", password, chromeMac).andExpect { status { isOk() } }
        assertThat(newDeviceCount(userId)).isZero()

        // 같은 기기 재로그인 — 무음.
        login("device-test@cheolma.com", password, chromeMac).andExpect { status { isOk() } }
        assertThat(newDeviceCount(userId)).isZero()

        // 처음 보는 브라우저 — NEW_DEVICE_LOGIN 알림 1건.
        login("device-test@cheolma.com", password, safariIphone).andExpect { status { isOk() } }
        assertThat(newDeviceCount(userId)).isEqualTo(1)

        // 그 브라우저도 이력이 생겼으므로 재로그인은 무음.
        login("device-test@cheolma.com", password, safariIphone).andExpect { status { isOk() } }
        assertThat(newDeviceCount(userId)).isEqualTo(1)
    }
}
