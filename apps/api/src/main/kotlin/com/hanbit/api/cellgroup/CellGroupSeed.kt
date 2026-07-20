package com.hanbit.api.cellgroup

import java.time.Instant

/**
 * 초기 목장 시드 — 빈 상태 UI 확인용 예시 2건. SeedRunner 가 cell_groups 가 비어있을 때만 적재한다.
 * 로스터·리더는 실제 회원(user_id)이 필요하므로 시드하지 않는다(매니저가 화면에서 배정).
 */
object CellGroupSeed {
    fun groups(now: Instant): List<CellGroup> = listOf(
        CellGroup(
            id = "cg-seed-jub-eun",
            name = "주은 목장",
            district = "1구역",
            description = "매주 금요일 저녁 가정에서 모이는 목장입니다. 함께 말씀을 나누고 삶을 돌봅니다.",
            createdAt = now,
            updatedAt = now,
        ),
        CellGroup(
            id = "cg-seed-han-bit",
            name = "한빛 목장",
            district = "2구역",
            description = "청년·직장인 중심 목장입니다. 격주 토요일 오전에 모입니다.",
            createdAt = now,
            updatedAt = now,
        ),
    )
}
