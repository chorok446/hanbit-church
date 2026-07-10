package com.cheolma.api.common

import jakarta.servlet.http.HttpServletRequest
import java.net.InetAddress

data class ClientRequestInfo(val ipAddress: String, val os: String, val browser: String = "알 수 없음") {
    companion object {
        fun from(request: HttpServletRequest): ClientRequestInfo {
            val userAgent = request.getHeader("User-Agent")
            return ClientRequestInfo(clientIp(request), parseClientOs(userAgent), parseClientBrowser(userAgent))
        }
    }
}

/** User-Agent 에서 대표 브라우저 이름을 뽑는다. 파생 브라우저 토큰이 Chrome/Safari 를 포함하므로 검사 순서가 중요하다. */
fun parseClientBrowser(userAgent: String?): String {
    if (userAgent.isNullOrBlank()) return "알 수 없음"
    return when {
        userAgent.contains("KAKAOTALK", ignoreCase = true) -> "카카오톡 인앱"
        userAgent.contains("Edg/", ignoreCase = true) || userAgent.contains("Edge/", ignoreCase = true) -> "Edge"
        userAgent.contains("Whale/", ignoreCase = true) -> "Whale"
        userAgent.contains("SamsungBrowser", ignoreCase = true) -> "Samsung Internet"
        userAgent.contains("OPR/", ignoreCase = true) || userAgent.contains("Opera", ignoreCase = true) -> "Opera"
        userAgent.contains("Firefox/", ignoreCase = true) -> "Firefox"
        userAgent.contains("CriOS", ignoreCase = true) -> "Chrome" // iOS Chrome
        userAgent.contains("Chrome/", ignoreCase = true) -> "Chrome"
        userAgent.contains("Safari/", ignoreCase = true) -> "Safari"
        else -> "기타"
    }
}

/**
 * rate limit·접속 기록이 공유하는 클라이언트 IP.
 *
 * X-Forwarded-For 는 **직접 연결한 상대(remoteAddr)가 신뢰 프록시(사설/루프백/링크로컬 대역)일 때만** 신뢰한다.
 * XFF 체인의 오른쪽(프록시에 가까운 쪽)부터 신뢰 프록시를 건너뛰고 만나는 첫 비신뢰 IP 를 실제 클라이언트로 본다
 * — 리버스 프록시(nginx 등)가 append 한 실제 peer 값보다 왼쪽은 클라이언트가 위조할 수 있으므로 신뢰하지 않는다.
 * API 가 프록시 없이 직접 노출된 경우(remoteAddr 가 공인 IP)에는 XFF 를 완전히 무시해 헤더 위조로 인한
 * rate limit 우회·접속 기록 오염을 차단한다.
 *
 * 프록시가 공인 IP 대역에 있으면(예: 외부 CDN/LB) 운영에서 신뢰 대역을 별도 확장해야 한다.
 */
fun clientIp(request: HttpServletRequest): String {
    val remoteAddr = request.remoteAddr?.takeIf { it.isNotBlank() } ?: "unknown"
    if (!isTrustedProxy(remoteAddr)) return remoteAddr
    val forwarded = request.getHeader("X-Forwarded-For") ?: return remoteAddr
    val chain = forwarded.split(",").map { it.trim() }.filter { it.isNotBlank() }
    return chain.lastOrNull { !isTrustedProxy(it) } ?: remoteAddr
}

/** 사설·루프백·링크로컬·ULA(fc00::/7) 대역이면 신뢰 프록시로 본다. 호스트명은 DNS 조회 없이 비신뢰 처리. */
private fun isTrustedProxy(ip: String): Boolean {
    val addr = parseIpLiteralOrNull(ip) ?: return false
    return addr.isLoopbackAddress ||
        addr.isSiteLocalAddress ||
        addr.isLinkLocalAddress ||
        addr.isAnyLocalAddress ||
        isUniqueLocalIpv6(addr)
}

/** IPv6 Unique Local Address (fc00::/7). Java InetAddress 에 전용 판별이 없어 직접 확인한다. */
private fun isUniqueLocalIpv6(addr: InetAddress): Boolean {
    val bytes = addr.address
    return bytes.size == 16 && (bytes[0].toInt() and 0xFE) == 0xFC
}

/** IP 리터럴("1.2.3.4"·"::1"·"fe80::1%eth0")만 파싱한다. 호스트명이면 null 을 돌려 DNS 조회를 피한다. */
private fun parseIpLiteralOrNull(ip: String): InetAddress? {
    val host = ip.substringBefore('%') // IPv6 zone id 제거
    if (host.isBlank()) return null
    // 점(IPv4)이나 콜론(IPv6)이 없으면 IP 리터럴이 아니다 — 호스트명 DNS 조회를 막는다.
    if ('.' !in host && ':' !in host) return null
    if (host.any { it !in "0123456789abcdefABCDEF.:" }) return null
    return runCatching { InetAddress.getByName(host) }.getOrNull()
}

fun parseClientOs(userAgent: String?): String {
    if (userAgent.isNullOrBlank()) return "알 수 없음"
    return when {
        userAgent.contains("Windows", ignoreCase = true) -> "Windows"
        userAgent.contains("iPhone", ignoreCase = true) || userAgent.contains("iPad", ignoreCase = true) -> "iOS"
        userAgent.contains("Mac OS X", ignoreCase = true) -> "macOS"
        userAgent.contains("Android", ignoreCase = true) -> "Android"
        userAgent.contains("Linux", ignoreCase = true) -> "Linux"
        else -> "기타"
    }
}
