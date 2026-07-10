package com.hanbit.api.notification

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.Instant

interface NotificationRepository : JpaRepository<Notification, String> {
    /** 자리 알림 중복 방지용 — 같은 대상·유형·링크의 미읽음 알림 존재 여부. */
    fun existsByUserIdAndTypeAndHrefAndReadAtIsNull(userId: Long, type: String, href: String): Boolean

    fun findByUserId(userId: Long, pageable: Pageable): Page<Notification>
    fun findByUserIdAndReadAtIsNull(userId: Long, pageable: Pageable): Page<Notification>
    fun findByUserIdAndTypeIn(userId: Long, types: List<String>, pageable: Pageable): Page<Notification>
    fun findByUserIdAndTypeInAndReadAtIsNull(userId: Long, types: List<String>, pageable: Pageable): Page<Notification>
    fun countByUserIdAndReadAtIsNull(userId: Long): Long
    fun findByIdAndUserId(id: String, userId: Long): Notification?

    @Modifying
    @Query("update Notification n set n.readAt = :readAt where n.userId = :userId and n.readAt is null")
    fun markAllRead(@Param("userId") userId: Long, @Param("readAt") readAt: Instant): Int

    @Modifying
    @Query("delete from Notification n where n.userId = :userId and n.readAt is not null")
    fun deleteReadByUserId(@Param("userId") userId: Long): Int

    /** 보존기간 정리 배치용 — 읽은 지 오래된 알림 삭제(읽은 시각 기준). */
    @Modifying
    @Query("delete from Notification n where n.readAt is not null and n.readAt < :cutoff")
    fun deleteReadBefore(@Param("cutoff") cutoff: java.time.Instant): Int

    /** 보존기간 정리 배치용 — 아주 오래된 미읽음 알림 삭제(생성 기준). */
    @Modifying
    @Query("delete from Notification n where n.readAt is null and n.createdAt < :cutoff")
    fun deleteUnreadCreatedBefore(@Param("cutoff") cutoff: java.time.Instant): Int
}
