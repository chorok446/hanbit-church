package com.hanbit.api.event

import com.hanbit.api.common.Photos
import com.hanbit.api.post.Author
import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

data class EventBody(val heading: String, val paragraphs: List<String>, val images: List<String>)

@Entity
@Table(
    name = "events",
    indexes = [
        Index(name = "idx_events_author_user_id", columnList = "author_user_id"),
        // 공개 목록/검색: hidden_at IS NULL + seq 내림차순.
        Index(name = "idx_events_hidden_seq", columnList = "hidden_at, seq"),
        // 상태(open/upcoming/closed) 필터 + 숨김 필터 + seq 정렬 복합.
        Index(name = "idx_events_status_hidden_seq", columnList = "status, hidden_at, seq"),
    ],
)
class Event(
    @Id val id: String,
    var status: String, // "open" | "upcoming" | "closed"
    var title: String,
    @Column(columnDefinition = "TEXT") var summary: String,
    var thumb: String,
    var recruitStart: String,
    var recruitEnd: String,
    var runStart: String,
    var runEnd: String,
    var capacity: Int,
    @Column(name = "joined_count") var joined: Int,
    var daysLeftLabel: String,
    @Embedded val author: Author,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var body: EventBody,
    @JsonIgnore var seq: Long = 0, // 정렬용. 시드=인덱스, 생성=epoch millis (최신이 위로)
    // 소유권 판정용. author.name 은 작성 시점의 표시 이름 snapshot 으로만 사용한다.
    // 시드/기존 행사는 null 을 허용하며 이름으로 소유자를 추정하지 않는다.
    @Column(name = "author_user_id")
    @JsonIgnore
    val authorUserId: Long? = null,
    // 관리자 숨김(soft hide). null = 공개. 값이 있으면 공개 목록/검색/상세(개설자 제외)에서 제외된다.
    @Column(name = "hidden_at") @JsonIgnore var hiddenAt: java.time.Instant? = null,
    @Column(name = "hidden_reason", length = 500) @JsonIgnore var hiddenReason: String? = null,
    // 개설자 삭제(soft delete). 값이 있으면 개설자 본인·관리자 복구 경로에서도 404 로 취급한다.
    // 삭제 시 hiddenAt 도 함께 세팅해 공개 노출 제외를 재사용한다.
    @Column(name = "deleted_at") @JsonIgnore var deletedAt: java.time.Instant? = null,
    // 모집 마감 임박(D-1) 알림 발송 시각 — EventReminderJob 의 멱등성 마커. null = 미발송.
    @Column(name = "recruit_end_reminder_sent_at") @JsonIgnore var recruitEndReminderSentAt: java.time.Instant? = null,
    // 실무 안내(전부 선택). null/blank 면 프론트 상세에서 해당 행을 숨긴다 — "추후 안내" 자리표시 없음.
    @Column(length = 200) var place: String? = null,
    @Column(length = 200) var audience: String? = null,
    @Column(length = 200) var fee: String? = null,
    @Column(length = 500) var supplies: String? = null,
    @Column(length = 200) var contact: String? = null,
    // 내용 수정 시각 — '수정됨' 표시용(게시글 V43 과 대칭). 상태 전환·숨김은 건드리지 않는다.
    @Column(name = "updated_at") var updatedAt: java.time.Instant? = null,
)

/**
 * 초기 적재 시드. apps/web/src/data/events.ts 와 1:1 미러. SeedRunner 가 비어있을 때만 저장.
 */
object EventSeed {
    private val worship = Photos.worship
    private val bible = Photos.bible
    private val community = Photos.community
    private val fellowship = Photos.fellowship
    private val serve = Photos.serve
    private val children = Photos.children

    private val longBody = listOf(
        "말씀과 기도, 교제가 함께하는 시간입니다. 자세한 일정과 준비물은 본문을 확인해 주세요.",
        "신청 후 참여가 어려워지면 미리 취소해 주시면 다른 분께 기회가 돌아갑니다.",
        "궁금한 점은 담당 교역자 또는 부서 임원에게 문의해 주세요.",
    )

    val events: List<Event> = listOf(
        Event("c1", "open", "여름 청년 수련회",
            "말씀 안에서 쉼과 회복을 누리는 2박 3일 청년 수련회.", community[1],
            "2026-06-18", "2026-07-18", "2026-07-22", "2026-07-24", 40, 39, "21일 남음",
            Author("청년부", true),
            EventBody("행사 소개", longBody, listOf(community[3], community[4])),
            place = "OO수양관(추후 안내)", audience = "청년부", fee = "1인 3만원", supplies = "성경, 세면도구, 편한 복장", contact = "청년부 임원"),
        Event("c2", "open", "지역 어르신 반찬 나눔 봉사",
            "매주 토요일 오전, 홀로 계신 어르신께 반찬을 전합니다.", serve[0],
            "2026-06-10", "2026-06-30", "2026-07-05", "2026-08-30", 60, 47, "5일 남음",
            Author("사랑부", true),
            EventBody("섬김 소개", longBody, listOf(serve[1], serve[2]))),
        Event("c3", "upcoming", "새가족 환영 식사",
            "새로 오신 분들과 함께하는 환영 식사와 교제.", fellowship[0],
            "2026-07-01", "2026-07-20", "2026-07-26", "2026-07-26", 30, 0, "3일 후 모집 시작",
            Author("새가족부", false),
            EventBody("모임 소개", longBody, listOf(fellowship[2], fellowship[3]))),
        Event("c4", "upcoming", "가을 전교인 야외 예배",
            "온 성도가 함께 드리는 야외 예배와 친교.", community[5],
            "2026-07-15", "2026-08-05", "2026-08-15", "2026-08-15", 100, 0, "12일 후 모집 시작",
            Author("한빛교회", true),
            EventBody("행사 소개", longBody, listOf(community[2], community[0]))),
        Event("c5", "closed", "봄 학기 성경공부반",
            "로마서를 함께 읽은 8주 과정이 은혜 가운데 마쳤습니다.", bible[0],
            "2026-04-01", "2026-04-30", "2026-05-10", "2026-06-30", 40, 40, "모집완료",
            Author("교육부", true),
            EventBody("과정 결과", longBody, listOf(bible[4], bible[3]))),
        Event("c6", "closed", "부활절 이웃 초청 잔치",
            "이웃과 함께 부활의 기쁨을 나눈 초청 잔치였습니다.", fellowship[1],
            "2026-03-10", "2026-03-30", "2026-04-05", "2026-04-05", 25, 25, "모집완료",
            Author("전도부", false),
            EventBody("행사 결과", longBody, listOf(fellowship[2], worship[4]))),
        Event("c7", "open", "주일학교 여름성경학교 교사 모집",
            "아이들과 함께할 여름성경학교 섬김 교사를 찾습니다.", children[0],
            "2026-06-20", "2026-07-10", "2026-07-27", "2026-07-29", 20, 12, "14일 남음",
            Author("주일학교", true),
            EventBody("섬김 소개", longBody, listOf(children[2], children[3]))),
        Event("c8", "open", "교회 화단 가꾸기",
            "함께 심고 가꾸며 교회 마당을 돌보는 소소한 섬김.", serve[3],
            "2026-06-01", "2026-07-01", "2026-07-10", "2026-07-31", 16, 9, "8일 남음",
            Author("관리부", false),
            EventBody("섬김 소개", longBody, listOf(serve[4], serve[5]))),
    )
}
