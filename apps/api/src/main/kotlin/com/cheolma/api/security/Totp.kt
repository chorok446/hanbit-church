package com.cheolma.api.security

import java.security.SecureRandom
import java.time.Clock
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * RFC 6238 TOTP (HMAC-SHA1, 6자리, 30초 스텝) 최소 구현.
 * 스펙이 고정돼 있어 외부 라이브러리 대신 직접 구현하고 RFC 테스트 벡터로 검증한다(TotpTest).
 * 시계 오차 허용: 앞뒤 1스텝(±30초).
 */
object Totp {
    private const val STEP_SECONDS = 30L
    private const val DIGITS = 6
    private const val WINDOW = 1 // 허용 스텝 오차(전후)

    private const val BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

    /** 새 시크릿(Base32, 160비트). Google Authenticator 등 표준 앱과 호환. */
    fun generateSecret(random: SecureRandom = SecureRandom()): String {
        val bytes = ByteArray(20)
        random.nextBytes(bytes)
        return base32Encode(bytes)
    }

    /** otpauth:// 등록 URL — QR 로 만들거나 수동 입력 안내에 쓴다. */
    fun otpauthUrl(secret: String, accountName: String, issuer: String): String {
        fun encode(value: String) = java.net.URLEncoder.encode(value, Charsets.UTF_8).replace("+", "%20")
        return "otpauth://totp/${encode(issuer)}:${encode(accountName)}" +
            "?secret=$secret&issuer=${encode(issuer)}&algorithm=SHA1&digits=$DIGITS&period=$STEP_SECONDS"
    }

    /** 현재 시각 기준 ±1스텝 안에서 코드가 맞는지. 코드는 6자리 숫자 문자열. */
    fun verify(secret: String, code: String, clock: Clock): Boolean {
        val normalized = code.trim()
        if (normalized.length != DIGITS || normalized.any { !it.isDigit() }) return false
        val step = clock.instant().epochSecond / STEP_SECONDS
        return (-WINDOW..WINDOW).any { offset -> codeAt(secret, step + offset) == normalized }
    }

    /** 특정 스텝의 코드 — 테스트(RFC 벡터)용으로도 공개한다. */
    fun codeAt(secret: String, step: Long): String {
        val key = base32Decode(secret)
        val message = ByteArray(8) { i -> (step ushr ((7 - i) * 8)).toByte() }
        val mac = Mac.getInstance("HmacSHA1")
        mac.init(SecretKeySpec(key, "HmacSHA1"))
        val hash = mac.doFinal(message)
        val offset = hash.last().toInt() and 0x0f
        val binary = ((hash[offset].toInt() and 0x7f) shl 24) or
            ((hash[offset + 1].toInt() and 0xff) shl 16) or
            ((hash[offset + 2].toInt() and 0xff) shl 8) or
            (hash[offset + 3].toInt() and 0xff)
        return (binary % 1_000_000).toString().padStart(DIGITS, '0')
    }

    fun base32Encode(data: ByteArray): String {
        val output = StringBuilder()
        var buffer = 0
        var bitsLeft = 0
        for (byte in data) {
            buffer = (buffer shl 8) or (byte.toInt() and 0xff)
            bitsLeft += 8
            while (bitsLeft >= 5) {
                output.append(BASE32_ALPHABET[(buffer shr (bitsLeft - 5)) and 0x1f])
                bitsLeft -= 5
            }
        }
        if (bitsLeft > 0) output.append(BASE32_ALPHABET[(buffer shl (5 - bitsLeft)) and 0x1f])
        return output.toString()
    }

    fun base32Decode(encoded: String): ByteArray {
        val clean = encoded.trim().uppercase().replace("=", "")
        val output = java.io.ByteArrayOutputStream()
        var buffer = 0
        var bitsLeft = 0
        for (char in clean) {
            val value = BASE32_ALPHABET.indexOf(char)
            require(value >= 0) { "invalid base32 character: $char" }
            buffer = (buffer shl 5) or value
            bitsLeft += 5
            if (bitsLeft >= 8) {
                output.write((buffer shr (bitsLeft - 8)) and 0xff)
                bitsLeft -= 8
            }
        }
        return output.toByteArray()
    }
}
