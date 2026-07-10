package com.hanbit.api.event

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock
import java.time.ZoneId

@Configuration(proxyBeanMethods = false)
class EventClockConfig {
    /**
     * 도메인 전역 Clock — KST 고정. 운영·사용자 기반이 한국이라 "오늘/내일" 같은 날짜 경계는
     * 항상 KST 기준이어야 한다. systemDefaultZone() 은 UTC 컨테이너에서 자정~오전 9시(KST) 사이
     * 날짜가 하루 어긋난다(행사 모집 마감·D-1 리마인더·통계 버킷 전부 영향).
     */
    @Bean
    fun eventClock(): Clock = Clock.system(ZoneId.of("Asia/Seoul"))
}
