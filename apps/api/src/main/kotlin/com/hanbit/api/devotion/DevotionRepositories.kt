package com.hanbit.api.devotion

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface DevotionRepository : JpaRepository<Devotion, String> {
    fun findByDevotionDate(date: LocalDate): Devotion?

    // 공개 "오늘의 말씀" — 오늘 자 없으면 가장 최근 발행분으로 폴백.
    fun findFirstByDevotionDateLessThanEqualOrderByDevotionDateDesc(date: LocalDate): Devotion?

    // 공개 목록(발행분만: date <= 오늘), 최신 날짜순.
    fun findByDevotionDateLessThanEqualOrderByDevotionDateDesc(date: LocalDate, pageable: Pageable): Page<Devotion>

    // 관리자 목록(미래 예약분 포함) 최신 날짜순.
    fun findAllByOrderByDevotionDateDesc(pageable: Pageable): Page<Devotion>

    // sitemap 전용 — 발행분(오늘 이하) id 만 최신 날짜순.
    @Query("select d.id from Devotion d where d.devotionDate <= :today order by d.devotionDate desc")
    fun findPublishedIds(@Param("today") today: LocalDate, pageable: Pageable): Page<String>

    // 은혜나눔 댓글 수는 DB 원자 증감으로 유지한다(동시 작성/삭제의 lost update 방지).
    @Modifying(clearAutomatically = true)
    @Query("update Devotion d set d.comments = d.comments + 1 where d.id = :id")
    fun incrementComments(@Param("id") id: String)

    @Modifying(clearAutomatically = true)
    @Query("update Devotion d set d.comments = case when d.comments > 0 then d.comments - 1 else 0 end where d.id = :id")
    fun decrementComments(@Param("id") id: String)
}

interface DevotionCommentRepository : JpaRepository<DevotionComment, String> {
    fun findByDevotionIdOrderByCreatedAtAscIdAsc(devotionId: String): List<DevotionComment>
    fun deleteByDevotionId(devotionId: String)
}
