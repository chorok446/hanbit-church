package com.hanbit.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
// @Scheduled 잡(예약 게시·알림 보존·행사 D-1 리마인더) 활성화. 이 어노테이션이 없으면
// 잡이 조용히 전부 멈춘다 — 테스트는 잡 메서드를 직접 호출해 잡아내지 못한다(실전 검증으로 발견).
@org.springframework.scheduling.annotation.EnableScheduling
class ApiApplication

fun main(args: Array<String>) {
	runApplication<ApiApplication>(*args)
}
