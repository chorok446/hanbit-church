package com.hanbit.api.devotion

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate

/**
 * 데일리 "오늘의 말씀" / 큐티 묵상. 하루 1개(devotionDate UNIQUE).
 * 공개 노출은 별도 컬럼 없이 devotionDate <= 오늘(KST) 로 게이트한다(DevotionService) —
 * 미래 날짜로 미리 등록하면 그날이 되어야 공개된다(예약 게시 개념 재사용, 잡 불필요).
 * 쓰기 권한(ADMIN·OPERATOR·CONTENT)은 SecurityConfig 의 admin devotions 경로 매처가 강제한다.
 */
@Entity
@Table(
    name = "devotions",
    indexes = [Index(name = "uq_devotions_date", columnList = "devotion_date", unique = true)],
)
class Devotion(
    @Id val id: String,
    @Column(name = "devotion_date", nullable = false, unique = true) var devotionDate: LocalDate,
    @Column(name = "verse_ref", nullable = false, length = 120) var verseRef: String,
    @Column(name = "verse_text", columnDefinition = "TEXT", nullable = false) var verseText: String,
    @Column(columnDefinition = "TEXT", nullable = false) var meditation: String,
    @Column(name = "author_name", nullable = false, length = 60) var authorName: String,
    // 작성자 식별(선택). 표시 이름은 authorName snapshot 을 쓴다.
    @Column(name = "author_user_id") val authorUserId: Long? = null,
    // 은혜나눔 댓글 수(비정규화). devotion_comments 증감과 함께 유지한다.
    @Column(nullable = false) var comments: Int = 0,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    @Column(name = "updated_at", nullable = false) var updatedAt: Instant,
)

/** 큐티 은혜나눔 댓글(경량·평면). 오래된 순(createdAt ASC) 정렬. */
@Entity
@Table(
    name = "devotion_comments",
    indexes = [Index(name = "idx_devotion_comments_devotion", columnList = "devotion_id, created_at")],
)
class DevotionComment(
    @Id val id: String,
    @Column(name = "devotion_id", nullable = false) val devotionId: String,
    @Column(name = "author_name", nullable = false, length = 60) val authorName: String,
    // 삭제 권한 판정용(본인). 이름은 작성 시점 snapshot.
    @Column(name = "author_user_id") val authorUserId: Long? = null,
    @Column(columnDefinition = "TEXT", nullable = false) var text: String,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
)
