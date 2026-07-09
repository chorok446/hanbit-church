package com.hanbit.api.report

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ReportRepository : JpaRepository<Report, String> {
    fun existsByReporterUserIdAndTargetTypeAndTargetId(
        reporterUserId: Long,
        targetType: String,
        targetId: String,
    ): Boolean

    fun findByReporterUserId(reporterUserId: Long, pageable: Pageable): Page<Report>

    // 관리자 신고 큐: 상태/대상종류 필터 조합(NotificationService 의 조건 분기 패턴).
    fun findByStatus(status: String, pageable: Pageable): Page<Report>

    fun findByTargetType(targetType: String, pageable: Pageable): Page<Report>

    fun findByStatusAndTargetType(status: String, targetType: String, pageable: Pageable): Page<Report>

    fun countByStatus(status: String): Long

    fun countByTargetTypeAndTargetId(targetType: String, targetId: String): Long

    /**
     * 신고 큐 목록의 대상별 신고 건수를 한 번에 집계한다(행당 count 쿼리 N+1 제거).
     * type/id 를 각각 IN 으로 받아 존재하는 (type,id) 조합만 GROUP BY 로 돌려준다.
     */
    @Query(
        "select r.targetType, r.targetId, count(r) from Report r " +
            "where r.targetType in :types and r.targetId in :ids group by r.targetType, r.targetId",
    )
    fun countGroupedByTarget(
        @Param("types") types: Collection<String>,
        @Param("ids") ids: Collection<String>,
    ): List<Array<Any>>

    // 관리자 통계용. seq 는 접수 시각(epoch millis)이므로 기간 내 값만 가져와 일 단위로 집계한다.
    @Query("select r.seq from Report r where r.seq >= :since")
    fun creationSeqSince(@Param("since") since: Long): List<Long>
}
