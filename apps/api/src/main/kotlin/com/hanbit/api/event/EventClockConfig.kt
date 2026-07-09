package com.hanbit.api.event

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

@Configuration(proxyBeanMethods = false)
class EventClockConfig {
    @Bean
    fun eventClock(): Clock = Clock.systemDefaultZone()
}
