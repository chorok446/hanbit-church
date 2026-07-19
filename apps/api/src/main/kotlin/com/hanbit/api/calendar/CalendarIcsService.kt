package com.hanbit.api.calendar

import com.hanbit.api.event.EventRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate

/**
 * 교회 일정 iCalendar(.ics) 피드 — 구글/애플 캘린더에서 URL 구독 가능.
 * 포함: 수동 일정(절기·심방 등) + 공개 행사(진행 기간, 숨김·삭제 제외).
 * RFC 5545 최소 구현 — 종일 일정(VALUE=DATE)만 쓰므로 타임존 블록이 필요 없다.
 */
@Service
class CalendarIcsService(
    private val manualEvents: ManualCalendarEventRepository,
    private val events: EventRepository,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun buildFeed(): String {
        val lines = mutableListOf(
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//hanbit-church//calendar//KO",
            "CALSCALE:GREGORIAN",
            "X-WR-CALNAME:한빛교회 일정",
        )

        manualEvents.findAllByOrderByStartDateAscIdAsc().forEach { item ->
            lines += vevent(
                uid = "manual-${item.id}@hanbit-church",
                summary = item.title,
                startDate = item.startDate,
                endDate = item.endDate,
                description = listOfNotNull(item.startTime, item.location).joinToString(" · ").ifBlank { null },
                location = item.location,
            )
        }

        // 공개 행사 — 진행 기간을 종일 일정으로. 숨김/삭제 제외 + 종료 1년 지난 행사는 쿼리에서 잘라
        // 공개 엔드포인트가 테이블 전체를 메모리에 올리지 않게 한다(캘린더 구독은 과거 이력이 목적이 아님).
        val horizon = LocalDate.now(clock).minusYears(1).toString()
        events.findByHiddenAtIsNullAndDeletedAtIsNullAndRunEndGreaterThanEqualOrderBySeqDesc(horizon)
            .forEach { event ->
                lines += vevent(
                    uid = "event-${event.id}@hanbit-church",
                    summary = event.title,
                    startDate = event.runStart,
                    endDate = event.runEnd.takeIf { it != event.runStart },
                    description = event.summary.ifBlank { null },
                    location = event.place,
                )
            }

        lines += "END:VCALENDAR"
        // RFC 5545 는 CRLF 를 요구하고, 75 옥텟 초과 라인은 접어야 한다.
        return lines.joinToString("\r\n", postfix = "\r\n") { fold(it) }
    }

    /**
     * 단건 행사 .ics — 행사 상세의 "캘린더에 추가" 다운로드용. 공개 상세와 같은 기준으로
     * 숨김·삭제 행사는 404. 구독 피드와 같은 VEVENT 빌더를 재사용한다.
     */
    @Transactional(readOnly = true)
    fun buildSingleEvent(eventId: String): String {
        val event = events.findById(eventId).orElse(null)
        if (event == null || event.hiddenAt != null || event.deletedAt != null) {
            throw org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND,
                "event $eventId not found",
            )
        }
        val lines = mutableListOf(
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//hanbit-church//calendar//KO",
            "CALSCALE:GREGORIAN",
        )
        lines += vevent(
            uid = "event-${event.id}@hanbit-church",
            summary = event.title,
            startDate = event.runStart,
            endDate = event.runEnd.takeIf { it != event.runStart },
            description = event.summary.ifBlank { null },
            location = event.place,
        )
        lines += "END:VCALENDAR"
        return lines.joinToString("\r\n", postfix = "\r\n") { fold(it) }
    }

    private fun vevent(
        uid: String,
        summary: String,
        startDate: String,
        endDate: String?,
        description: String?,
        location: String?,
    ): List<String> {
        val start = startDate.replace("-", "")
        // DTEND(VALUE=DATE) 는 exclusive — 마지막 날 포함을 위해 +1일.
        val endExclusive = java.time.LocalDate.parse(endDate ?: startDate).plusDays(1)
            .toString().replace("-", "")
        return buildList {
            add("BEGIN:VEVENT")
            add("UID:$uid")
            add("DTSTAMP:19700101T000000Z") // 결정적 출력(테스트·캐시 친화) — 내용 변경은 UID 단위로 갱신된다.
            add("DTSTART;VALUE=DATE:$start")
            add("DTEND;VALUE=DATE:$endExclusive")
            add("SUMMARY:${escape(summary)}")
            description?.let { add("DESCRIPTION:${escape(it)}") }
            location?.let { add("LOCATION:${escape(it)}") }
            add("END:VEVENT")
        }
    }

    /** RFC 5545 TEXT 이스케이프 — 백슬래시·세미콜론·콤마·개행(CRLF·CR·LF 모두 정규화). */
    private fun escape(value: String): String = value
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\n", "\\n")

    /**
     * RFC 5545 3.1 라인 폴딩 — 한 콘텐츠 라인이 75 옥텟(UTF-8)을 넘으면
     * CRLF + 선행 공백으로 접는다. 이어지는 물리 라인은 선행 공백 1옥텟을 포함해 75 옥텟 이하.
     * 코드포인트 단위로 세어 멀티바이트 문자(한글 3바이트·이모지 등)를 쪼개지 않는다.
     */
    private fun fold(line: String): String {
        val out = StringBuilder()
        var octets = 0
        var i = 0
        while (i < line.length) {
            val cp = line.codePointAt(i)
            // 코드포인트 값으로 UTF-8 바이트 폭을 바로 구한다(문자당 String/ByteArray 할당 회피).
            val w = when {
                cp <= 0x7F -> 1
                cp <= 0x7FF -> 2
                cp <= 0xFFFF -> 3
                else -> 4
            }
            if (octets + w > 75) {
                out.append("\r\n ")
                octets = 1 // 선행 공백
            }
            out.appendCodePoint(cp)
            octets += w
            i += Character.charCount(cp)
        }
        return out.toString()
    }
}
