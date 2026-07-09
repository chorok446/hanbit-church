package com.dasida.api.praise

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant
import java.time.LocalDate

/** 콘티 상태. DRAFT=준비 중, CONFIRMED=확정, COMPLETED=예배 완료, ARCHIVED=보관. */
enum class PraiseSetlistStatus { DRAFT, CONFIRMED, COMPLETED, ARCHIVED }

/** 배정별 참석 응답 상태. */
enum class PraiseAttendanceStatus { PENDING, AVAILABLE, LATE, UNAVAILABLE }

/** 곡의 외부 자료 링크(악보·데모 영상 등). */
data class PraiseSongLink(
    val label: String = "",
    val url: String = "",
)

/**
 * 콘티 안의 곡 한 개. 콘티에 종속된 문서 성격이라 별도 테이블 없이 JSON 배열로 저장한다.
 * 가사 전문은 저작권 문제로 싣지 않는다 — 곡명·키·BPM·메모만.
 */
data class PraiseSong(
    val id: String = "",
    /** 콘티 안 순서(1부터). */
    val order: Int = 0,
    val title: String = "",
    /** 조성 (예: "G", "Am"). */
    val key: String = "",
    val bpm: Int = 0,
    /** "worship"(경배) / "praise"(찬양) — 프론트 PraiseSongType 과 1:1. */
    val type: String = "praise",
    val links: List<PraiseSongLink> = emptyList(),
    /** 곡 전체 메모(구성·전조 등). */
    val note: String? = null,
    /** 파트별 메모. key = PraisePart 이름. */
    val partNotes: Map<String, String>? = null,
)

/** 콘티에 붙는 팀 공지. */
data class PraiseNoticeItem(
    val id: String = "",
    val title: String = "",
    val body: String = "",
    val author: String = "",
    /** yyyy-MM-dd */
    val date: String = "",
    val pinned: Boolean = false,
)

/**
 * 찬양팀 콘티(세트리스트). 조회·수정은 찬양팀 내부 전용 — 권한은 PraiseService 가
 * 요청자 praiseRole/사이트 role 을 DB 에서 조회해 검사한다(SecurityConfig 는 인증만 요구).
 */
@Entity
@Table(
    name = "praise_setlists",
    indexes = [Index(name = "idx_praise_setlists_worship_date", columnList = "worship_date")],
)
class PraiseSetlist(
    @Id val id: String,
    @Column(nullable = false, length = 100) var title: String,
    @Column(name = "worship_date", nullable = false) var worshipDate: LocalDate,
    // 예배 구분 표시 문구 (예: "주일 2부 예배").
    @Column(name = "worship_type", nullable = false, length = 50) var worshipType: String,
    // 리허설 안내 문구 (예: "주일 오전 8:30 본당").
    @Column(name = "rehearsal_time", length = 100) var rehearsalTime: String? = null,
    // 예배 시각 표시 문구 (예: "오전 11:00").
    @Column(name = "service_time", length = 50) var serviceTime: String? = null,
    @Column(length = 100) var location: String? = null,
    // 콘티를 만든 리더. 표시·감사용 — 권한 판단은 매 요청 praiseRole 로 한다.
    @Column(name = "leader_user_id") var leaderUserId: Long? = null,
    @Column(nullable = false, length = 20) var status: String = PraiseSetlistStatus.DRAFT.name,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json", nullable = false)
    var songs: List<PraiseSong> = emptyList(),
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json")
    var notices: List<PraiseNoticeItem>? = null,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)
