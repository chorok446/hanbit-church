package com.cheolma.api.security

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

/**
 * RFC 6238 Appendix B 테스트 벡터(SHA-1)로 TOTP 구현을 검증한다.
 * 벡터는 8자리 기준이므로 끝 6자리를 비교한다(우리 구현은 6자리 = mod 10^6).
 */
class TotpTest {
    // RFC 6238 SHA-1 시드 "12345678901234567890" 의 Base32 표현.
    private val rfcSecret = Totp.base32Encode("12345678901234567890".toByteArray())

    private fun clockAt(epochSecond: Long): Clock = Clock.fixed(Instant.ofEpochSecond(epochSecond), ZoneOffset.UTC)

    @Test
    fun `RFC 6238 테스트 벡터와 일치한다`() {
        // (epoch seconds, 8자리 기대값) — RFC 6238 Appendix B, SHA-1 행.
        val vectors = listOf(
            59L to "94287082",
            1111111109L to "07081804",
            1111111111L to "14050471",
            1234567890L to "89005924",
            2000000000L to "69279037",
            20000000000L to "65353130",
        )
        for ((epoch, expected8) in vectors) {
            val code = Totp.codeAt(rfcSecret, epoch / 30)
            assertThat(code).isEqualTo(expected8.takeLast(6))
        }
    }

    @Test
    fun `verify 는 현재·전후 1스텝 코드를 허용하고 그 밖은 거절한다`() {
        val now = 1111111109L
        val clock = clockAt(now)
        val step = now / 30

        assertThat(Totp.verify(rfcSecret, Totp.codeAt(rfcSecret, step), clock)).isTrue()
        assertThat(Totp.verify(rfcSecret, Totp.codeAt(rfcSecret, step - 1), clock)).isTrue()
        assertThat(Totp.verify(rfcSecret, Totp.codeAt(rfcSecret, step + 1), clock)).isTrue()
        assertThat(Totp.verify(rfcSecret, Totp.codeAt(rfcSecret, step + 2), clock)).isFalse()
        assertThat(Totp.verify(rfcSecret, "12345", clock)).isFalse() // 5자리
        assertThat(Totp.verify(rfcSecret, "abcdef", clock)).isFalse()
    }

    @Test
    fun `base32 인코딩-디코딩 왕복이 유지되고 시크릿은 매번 다르다`() {
        val data = "12345678901234567890".toByteArray()
        assertThat(Totp.base32Decode(Totp.base32Encode(data))).isEqualTo(data)
        assertThat(Totp.generateSecret()).isNotEqualTo(Totp.generateSecret())
        assertThat(Totp.otpauthUrl("ABC234", "user@cheolma.com", "철마제일교회"))
            .startsWith("otpauth://totp/")
            .contains("secret=ABC234")
    }
}
