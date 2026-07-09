package com.cheolma.api.auth

import org.springframework.stereotype.Service
import java.net.InetAddress
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.util.Collections

data class GeoLocation(val country: String?, val region: String?)

/**
 * IP → 대략적인 국가·지역 조회(접속기록용). 외부 무료 API(ip-api.com)를 짧은 타임아웃으로
 * best-effort 호출한다 — 실패·사설 IP 는 조용히 null 로 두고 로그인 흐름을 막지 않는다.
 * 같은 IP 재조회를 줄이려고 소형 인메모리 캐시를 둔다(무료 API 분당 45회 제한 완화).
 */
@Service
class GeoIpService {
    private val client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(800)).build()

    // 접근 순서 LRU. 상한 초과 시 가장 오래 안 쓴 항목만 제거한다(예전엔 전체 clear 로 캐시가 통째로 날아갔다).
    private val cache: MutableMap<String, GeoLocation> = Collections.synchronizedMap(
        object : LinkedHashMap<String, GeoLocation>(256, 0.75f, true) {
            override fun removeEldestEntry(eldest: Map.Entry<String, GeoLocation>): Boolean = size > MAX_CACHE
        },
    )

    fun lookup(ip: String): GeoLocation? {
        if (ip.isBlank() || ip == "unknown" || isPrivateOrLocal(ip)) return LOCAL
        cache[ip]?.let { return it }
        return try {
            val request = HttpRequest.newBuilder()
                .uri(URI.create("http://ip-api.com/json/$ip?fields=status,country,regionName&lang=ko"))
                .timeout(Duration.ofMillis(1200))
                .GET()
                .build()
            val body = client.send(request, HttpResponse.BodyHandlers.ofString()).body()
            if (!body.contains("\"status\":\"success\"")) return null
            val geo = GeoLocation(country = extract(body, "country"), region = extract(body, "regionName"))
            cache[ip] = geo // LinkedHashMap.removeEldestEntry 가 상한을 관리한다
            geo
        } catch (_: Exception) {
            null
        }
    }

    /** 의존성 없이 단순 JSON 문자열 값 추출("key":"value"). geo 필드는 중첩·이스케이프가 없다. */
    private fun extract(json: String, key: String): String? =
        Regex("\"$key\"\\s*:\\s*\"([^\"]*)\"").find(json)?.groupValues?.get(1)?.takeIf { it.isNotBlank() }

    private fun isPrivateOrLocal(ip: String): Boolean =
        try {
            val addr = InetAddress.getByName(ip)
            addr.isLoopbackAddress || addr.isSiteLocalAddress || addr.isLinkLocalAddress || addr.isAnyLocalAddress
        } catch (_: Exception) {
            true // 형식이 이상한 IP 는 외부 조회하지 않는다
        }

    private companion object {
        val LOCAL = GeoLocation(country = null, region = "내부망")
        const val MAX_CACHE = 5000
    }
}
