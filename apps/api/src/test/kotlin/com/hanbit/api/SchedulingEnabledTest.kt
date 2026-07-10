package com.hanbit.api

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.scheduling.config.ScheduledTaskHolder

/**
 * @Scheduled 잡이 실제로 등록되는지 검증. 잡 테스트들은 메서드를 직접 호출하므로
 * @EnableScheduling 이 빠져 잡 전체가 조용히 멈춰도 잡아내지 못한다 — 실전에서 겪은 회귀 방지.
 */
@SpringBootTest
class SchedulingEnabledTest(
    @param:Autowired private val holders: List<ScheduledTaskHolder>,
) {
    @Test
    fun `스케줄 태스크가 등록돼 있다 - 예약 게시·알림 보존·행사 리마인더`() {
        val tasks = holders.flatMap { it.scheduledTasks }
        // 예약 게시(fixedDelay) + 알림 보존(cron) + 행사 리마인더(cron) 최소 3개.
        assertThat(tasks.size).isGreaterThanOrEqualTo(3)
    }
}
