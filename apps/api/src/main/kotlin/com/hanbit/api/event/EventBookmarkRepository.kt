package com.hanbit.api.event

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional

interface EventBookmarkRepository : JpaRepository<EventBookmark, String> {
    fun existsByEventIdAndUserId(eventId: String, userId: Long): Boolean
    fun findByEventIdAndUserId(eventId: String, userId: Long): EventBookmark?
    fun findByUserId(userId: Long): List<EventBookmark>

    /** 마감 임박 알림 수신자 조회용 — 행사를 저장한 사용자 전체. */
    fun findByEventId(eventId: String): List<EventBookmark>
    fun findByUserIdAndEventIdIn(userId: Long, eventIds: Collection<String>): List<EventBookmark>
    fun countByEventId(eventId: String): Long

    @Transactional
    fun deleteByEventId(eventId: String)
}
