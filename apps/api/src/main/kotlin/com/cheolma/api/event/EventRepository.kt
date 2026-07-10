package com.cheolma.api.event

import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface EventRepository : JpaRepository<Event, String> {
    /** 모집 마감 임박(D-1) 알림 대상 — recruitEnd 는 ISO(yyyy-MM-dd) 문자열이라 동등 비교로 충분. */
    fun findByStatusAndRecruitEndAndHiddenAtIsNullAndDeletedAtIsNullAndRecruitEndReminderSentAtIsNull(
        status: String,
        recruitEnd: String,
    ): List<Event>

    // 관리자 대시보드 — 모집중인데 마감일이 임박(또는 경과)한 행사 수. recruitEnd 는 ISO(yyyy-MM-dd)라 문자열 비교 가능.
    fun countByStatusAndHiddenAtIsNullAndDeletedAtIsNullAndRecruitEndLessThanEqual(status: String, recruitEnd: String): Long

    // iCal 피드 — 공개 행사 중 진행 종료가 기준일 이후인 것만(과거 무한 적재 방지). runEnd 는 ISO 문자열.
    fun findByHiddenAtIsNullAndDeletedAtIsNullAndRunEndGreaterThanEqualOrderBySeqDesc(runEnd: String): List<Event>

    // 관리자 콘텐츠 관리 목록 — 숨김 포함 전체 / 숨김만 (+ 제목/작성자 검색).
    fun findAllByOrderBySeqDesc(pageable: Pageable): Page<Event>
    fun findByHiddenAtIsNotNullOrderBySeqDesc(pageable: Pageable): Page<Event>
    fun findByTitleContainingIgnoreCaseOrAuthorNameContainingIgnoreCaseOrderBySeqDesc(
        title: String,
        authorName: String,
        pageable: Pageable,
    ): Page<Event>
    fun findByHiddenAtIsNotNullAndTitleContainingIgnoreCaseOrderBySeqDesc(title: String, pageable: Pageable): Page<Event>

    /** 정원 동시성 방어용 write lock 조회. join 트랜잭션에서 가장 먼저 호출해 행사별로 직렬화. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Event c where c.id = :id")
    fun findByIdForUpdate(@Param("id") id: String): Event?

    fun findAllByIdInOrderBySeqDesc(ids: Collection<String>): List<Event>

    // 관리자 통계용. seq 는 개설 시각(epoch millis)이므로 기간 내 값만 가져와 일 단위로 집계한다.
    @Query("select c.seq from Event c where c.seq >= :since")
    fun creationSeqSince(@Param("since") since: Long): List<Long>
    fun findByAuthorUserIdOrderBySeqDesc(authorUserId: Long): List<Event>
    fun findByAuthorUserId(authorUserId: Long, pageable: Pageable): Page<Event>

    // 개설자 본인 목록(mine)용. 숨김은 보이지만 삭제(soft delete)는 제외한다.
    fun findByAuthorUserIdAndDeletedAtIsNullOrderBySeqDesc(authorUserId: Long): List<Event>
    fun findByAuthorUserIdAndDeletedAtIsNull(authorUserId: Long, pageable: Pageable): Page<Event>
    fun countByAuthorUserId(authorUserId: Long): Long

    // 공개 노출 경로용(숨김 제외). 개설자 본인 목록(mine)은 위의 무필터 메서드를 그대로 쓴다.
    fun findByHiddenAtIsNull(sort: org.springframework.data.domain.Sort): List<Event>
    fun findAllByIdInAndHiddenAtIsNullOrderBySeqDesc(ids: Collection<String>): List<Event>

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Event c set c.author.name = :name, c.author.verified = false, c.author.profileImageUrl = null where c.authorUserId = :userId")
    fun anonymizeAuthor(@Param("userId") userId: Long, @Param("name") name: String): Int

    /** 프로필 변경 시 기존 작성물의 author snapshot(name·이미지)을 최신 값으로 맞춘다. verified 는 유지. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Event c set c.author.name = :name, c.author.profileImageUrl = :imageUrl where c.authorUserId = :userId")
    fun syncAuthorProfile(@Param("userId") userId: Long, @Param("name") name: String, @Param("imageUrl") imageUrl: String?): Int

    @Query("SELECT c.id FROM Event c WHERE c.hiddenAt IS NULL ORDER BY c.seq DESC, c.id ASC")
    fun findIds(pageable: Pageable): Page<String>
}
