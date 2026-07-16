package com.hanbit.api.auth

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
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
 * IP → 대략적인 국가·지역 조회(접속기록용). **기본 비활성** — 접속 IP 를 외부로 보내지 않는다.
 * 조회를 켜려면 `app.geoip.endpoint` 에 **https** URL 템플릿(`{ip}` 플레이스홀더 포함, 응답은 ip-api 호환
 * status/country/regionName JSON)을 준다 — 예: `https://<host>/json/{ip}?fields=status,country,regionName&lang=ko`
 * (국가·지역명을 한국어로 받으려면 `lang=ko` 를 포함할 것). 평문 http 는 도청 위험이라 거부한다(설정돼도 비활성 처리).
 * 활성 시에도 실패·사설 IP 는 조용히 null 로 두고 로그인 흐름을 막지 않는다. 같은 IP 재조회는 소형 인메모리 캐시로 줄인다.
 */
@Service
class GeoIpService(
    @param:Value("\${app.geoip.endpoint:}") endpointTemplate: String,
) {
    // https 이고 {ip} 플레이스홀더를 포함할 때만 활성. 빈 값(기본)·평문 http 는 null → 외부 호출 안 함.
    private val endpoint: String? = endpointTemplate.trim().takeIf { it.startsWith("https://") && it.contains("{ip}") }

    init {
        val raw = endpointTemplate.trim()
        if (raw.isNotEmpty() && endpoint == null) {
            log.warn("app.geoip.endpoint 가 'https://.../{ip}' 형식이 아니라 GeoIP 조회를 비활성화한다(평문 http 금지).")
        }
    }

    private val client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(800)).build()

    // 접근 순서 LRU. 상한 초과 시 가장 오래 안 쓴 항목만 제거한다(예전엔 전체 clear 로 캐시가 통째로 날아갔다).
    private val cache: MutableMap<String, GeoLocation> = Collections.synchronizedMap(
        object : LinkedHashMap<String, GeoLocation>(256, 0.75f, true) {
            override fun removeEldestEntry(eldest: Map.Entry<String, GeoLocation>): Boolean = size > MAX_CACHE
        },
    )

    fun lookup(ip: String): GeoLocation? {
        if (ip.isBlank() || ip == "unknown" || isPrivateOrLocal(ip)) return LOCAL
        val ep = endpoint ?: return null // 기본 비활성 — 접속 IP 외부 전송 안 함
        // 실패도 캐시하므로 NEGATIVE 마커는 null 로 되돌려 준다(재조회 폭주·rate limit 소진 방지).
        cache[ip]?.let { cached -> return cached.takeUnless { it === NEGATIVE } }
        return try {
            val request = HttpRequest.newBuilder()
                .uri(URI.create(ep.replace("{ip}", ip)))
                .timeout(Duration.ofMillis(1200))
                .GET()
                .build()
            val body = client.send(request, HttpResponse.BodyHandlers.ofString()).body()
            if (!body.contains("\"status\":\"success\"")) {
                cache[ip] = NEGATIVE
                return null
            }
            val geo = GeoLocation(country = extract(body, "country"), region = extract(body, "regionName"))
            cache[ip] = geo // LinkedHashMap.removeEldestEntry 가 상한을 관리한다
            geo
        } catch (_: Exception) {
            cache[ip] = NEGATIVE // 실패(타임아웃·오류)도 캐시 — best-effort 라 재시도보다 로그인 지연·호출 폭주 방지가 우선
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
        val log = LoggerFactory.getLogger(GeoIpService::class.java)
        val LOCAL = GeoLocation(country = null, region = "내부망")
        // 조회 실패(비-success·오류) 캐시 마커 — 같은 IP 반복 조회를 막는다. lookup 은 이 값을 null 로 되돌린다.
        val NEGATIVE = GeoLocation(country = null, region = null)
        const val MAX_CACHE = 5000
    }
}
