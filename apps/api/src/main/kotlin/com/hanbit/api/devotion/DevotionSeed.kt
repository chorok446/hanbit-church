package com.hanbit.api.devotion

import java.time.Clock
import java.time.Instant
import java.time.LocalDate

/**
 * 데일리 큐티 시드 — 빈 테이블에만 적재(SeedRunner). 오늘 포함 최근 며칠 치를 넣어
 * 홈 "오늘의 말씀" 카드와 /devotion 목록이 빈 화면으로 보이지 않게 한다.
 */
object DevotionSeed {
    private data class Draft(val verseRef: String, val verseText: String, val meditation: String)

    private val drafts = listOf(
        Draft(
            "시편 46:10",
            "너희는 가만히 있어 내가 하나님 됨을 알지어다",
            "분주함이 미덕처럼 여겨지는 시대에, 하나님은 멈춤을 명하십니다. 오늘 잠시 손을 내려놓고 " +
                "그분이 하나님 되심을 조용히 인정하는 시간을 가져 보세요. 쉼은 게으름이 아니라 신뢰의 고백입니다.",
        ),
        Draft(
            "빌립보서 4:6-7",
            "아무 것도 염려하지 말고 다만 모든 일에 기도와 간구로 너희 구할 것을 감사함으로 하나님께 아뢰라",
            "염려는 문제를 해결하지 못하지만 기도는 우리를 붙드시는 분께로 시선을 돌립니다. " +
                "오늘 마음을 짓누르는 한 가지를 구체적으로 아뢰고, 그 결과보다 먼저 지켜 주시는 평강을 구해 봅시다.",
        ),
        Draft(
            "예레미야애가 3:22-23",
            "여호와의 인자와 긍휼이 무궁하시므로 우리가 진멸되지 아니함이니이다 이것들이 아침마다 새로우니",
            "어제의 실패가 오늘의 정죄가 되지 않습니다. 하나님의 자비는 아침마다 새롭게 부어집니다. " +
                "지난 날을 붙들지 말고, 오늘 새로 주어진 은혜의 분량으로 하루를 시작하세요.",
        ),
    )

    /** today 부터 과거로 하루씩. 저자 표기는 시드 값 고정. */
    fun devotions(clock: Clock): List<Devotion> {
        val today = LocalDate.now(clock)
        val now = Instant.now(clock)
        return drafts.mapIndexed { i, d ->
            Devotion(
                id = "dv-seed-${i + 1}",
                devotionDate = today.minusDays(i.toLong()),
                verseRef = d.verseRef,
                verseText = d.verseText,
                meditation = d.meditation,
                authorName = "말씀지기",
                createdAt = now,
                updatedAt = now,
            )
        }
    }
}
