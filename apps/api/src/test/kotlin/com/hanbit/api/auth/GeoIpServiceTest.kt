package com.hanbit.api.auth

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

/**
 * GeoIP 는 기본 비공개(비활성) — 접속 IP 를 외부로 보내지 않고, 평문 http endpoint 도 거부한다.
 * 아래 케이스는 모두 비활성/로컬 경로라 실제 네트워크 호출이 없다(테스트 결정적).
 */
class GeoIpServiceTest {
    @Test
    fun `endpoint 미설정이면 공인 IP 도 외부 조회 없이 null`() {
        assertNull(GeoIpService(endpointTemplate = "").lookup("8.8.8.8"))
    }

    @Test
    fun `평문 http endpoint 는 비활성으로 취급돼 공인 IP 가 null`() {
        val svc = GeoIpService(endpointTemplate = "http://ip-api.com/json/{ip}?fields=status,country,regionName")
        assertNull(svc.lookup("8.8.8.8"))
    }

    @Test
    fun `ip 플레이스홀더 없는 https 도 비활성`() {
        assertNull(GeoIpService(endpointTemplate = "https://example.com/json/").lookup("8.8.8.8"))
    }

    @Test
    fun `사설·로컬 IP 는 endpoint 와 무관하게 내부망으로 표시한다`() {
        val svc = GeoIpService(endpointTemplate = "")
        assertEquals("내부망", svc.lookup("127.0.0.1")?.region)
        assertEquals("내부망", svc.lookup("10.0.0.5")?.region)
    }
}
