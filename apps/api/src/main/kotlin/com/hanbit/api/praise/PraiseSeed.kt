package com.hanbit.api.praise

import java.time.Instant
import java.time.LocalDate

/**
 * 초기 콘티 시드. P0 프론트 mock(apps/web/src/data/praise-team.ts)에 있던 예시 콘티 1건 —
 * SeedRunner 가 praise_setlists 가 비어있을 때만 적재한다.
 * 배정은 실제 회원(user_id)이 필요하므로 시드하지 않는다(리더가 화면에서 배정 — 빈 상태 UI 유지).
 */
object PraiseSeed {
    fun setlists(now: Instant): List<PraiseSetlist> = listOf(
        PraiseSetlist(
            id = "ps-seed-2026-07-12-sunday-2",
            title = "7월 둘째 주 콘티",
            worshipDate = LocalDate.parse("2026-07-12"),
            worshipType = "주일 2부 예배",
            rehearsalTime = "주일 오전 8:30 본당 (음향 콘솔 오픈 8:15)",
            serviceTime = "오전 11:00",
            location = "본당",
            status = PraiseSetlistStatus.CONFIRMED.name,
            songs = listOf(
                PraiseSong(
                    id = "song-1", order = 1, title = "주님 말씀하시면", key = "G", bpm = 72, type = "worship",
                    links = listOf(
                        PraiseSongLink(
                            label = "데모 영상",
                            url = "https://www.youtube.com/results?search_query=%EC%A3%BC%EB%8B%98+%EB%A7%90%EC%94%80%ED%95%98%EC%8B%9C%EB%A9%B4",
                        ),
                    ),
                    note = "1절 잔잔하게 시작 → 2절부터 풀 밴드. 마지막 후렴 반복 2회.",
                    partNotes = mapOf(
                        "KEYBOARD" to "인트로 8마디 패드 단독.",
                        "DRUMS" to "2절 진입 필인으로 신호.",
                    ),
                ),
                PraiseSong(
                    id = "song-2", order = 2, title = "물이 바다 덮음같이", key = "A", bpm = 128, type = "praise",
                    links = listOf(
                        PraiseSongLink(
                            label = "데모 영상",
                            url = "https://www.youtube.com/results?search_query=%EB%AC%BC%EC%9D%B4+%EB%B0%94%EB%8B%A4+%EB%8D%AE%EC%9D%8C%EA%B0%99%EC%9D%B4",
                        ),
                    ),
                    note = "간주에서 브릿지로 바로 연결. 엔딩은 한 번 끊고 아카펠라 후렴.",
                    partNotes = mapOf(
                        "VOCAL" to "브릿지 화음 3성부 — 연습 영상 참고.",
                        "LYRICS" to "아카펠라 후렴 자막 미리 준비.",
                    ),
                ),
                PraiseSong(
                    id = "song-3", order = 3, title = "은혜", key = "E", bpm = 70, type = "worship",
                    links = listOf(
                        PraiseSongLink(
                            label = "데모 영상",
                            url = "https://www.youtube.com/results?search_query=%EC%9D%80%ED%98%9C+%EC%86%90%EA%B2%BD%EB%AF%BC",
                        ),
                    ),
                    note = "설교 전 마무리 곡 — 마지막 후렴 후 기도로 자연스럽게 연결.",
                    partNotes = mapOf("SOUND" to "기도 연결 구간 보컬 리버브 살짝 올리기."),
                ),
            ),
            notices = listOf(
                PraiseNoticeItem(
                    id = "notice-1",
                    title = "7월 둘째 주 리허설 시간 변경",
                    body = "7월 12일(주일) 리허설을 오전 9:00 → 오전 8:30으로 앞당깁니다. 음향·자막 팀은 8:15까지 콘솔 세팅을 부탁드립니다.",
                    author = "찬양팀 리더",
                    date = "2026-07-07",
                    pinned = true,
                ),
                PraiseNoticeItem(
                    id = "notice-2",
                    title = "여름 수련회 찬양팀 지원자 모집",
                    body = "8월 여름 수련회 저녁 집회 찬양팀을 모집합니다. 참여를 원하시는 분은 이번 주까지 리더에게 알려주세요.",
                    author = "찬양팀 리더",
                    date = "2026-07-05",
                ),
            ),
            createdAt = now,
            updatedAt = now,
        ),
    )
}
