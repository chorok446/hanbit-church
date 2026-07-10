package com.cheolma.api.common

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest

class ClientRequestInfoTest {
    @Test
    fun `parseClientOs 는 주요 OS 를 구분한다`() {
        assertEquals("Windows", parseClientOs("Mozilla/5.0 (Windows NT 10.0)"))
        assertEquals("macOS", parseClientOs("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"))
        assertEquals("iOS", parseClientOs("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"))
        assertEquals("Android", parseClientOs("Mozilla/5.0 (Linux; Android 14)"))
    }

    private fun request(remoteAddr: String, xff: String? = null) =
        MockHttpServletRequest().apply {
            this.remoteAddr = remoteAddr
            if (xff != null) addHeader("X-Forwarded-For", xff)
        }

    @Test
    fun `신뢰 프록시 뒤에서는 XFF 오른쪽의 첫 비신뢰 IP 를 클라이언트로 본다`() {
        // nginx(사설) 가 실제 peer 를 append: 왼쪽은 위조 가능, 오른쪽 비신뢰가 진짜 클라이언트.
        assertEquals("203.0.113.9", clientIp(request("127.0.0.1", "9.9.9.9, 203.0.113.9")))
        assertEquals("203.0.113.9", clientIp(request("10.0.0.5", "203.0.113.9")))
        // 여러 신뢰 프록시를 건너뛴다.
        assertEquals("203.0.113.9", clientIp(request("10.0.0.5", "203.0.113.9, 10.0.0.5, 192.168.1.2")))
    }

    @Test
    fun `직접 노출(비신뢰 remoteAddr)에서는 XFF 를 무시해 위조를 막는다`() {
        // 공인 IP 에서 직접 온 요청이 XFF 를 위조해도 remoteAddr 를 쓴다.
        assertEquals("198.51.100.7", clientIp(request("198.51.100.7", "1.2.3.4")))
    }

    @Test
    fun `XFF 가 없으면 remoteAddr 를 그대로 쓴다`() {
        assertEquals("203.0.113.9", clientIp(request("203.0.113.9")))
    }
}
