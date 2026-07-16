package com.hanbit.api.event

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional

interface EventParticipantRepository : JpaRepository<EventParticipant, String> {
    fun existsByEventIdAndUserId(eventId: String, userId: Long): Boolean
    fun findByEventIdAndUserId(eventId: String, userId: Long): EventParticipant?
    fun findByIdAndEventId(id: String, eventId: String): EventParticipant?
    fun findByUserIdAndEventIdIn(userId: Long, eventIds: Collection<String>): List<EventParticipant>
    fun findByUserId(userId: Long): List<EventParticipant>
    fun findByEventId(eventId: String): List<EventParticipant>
    fun findByEventId(eventId: String, sort: org.springframework.data.domain.Sort): List<EventParticipant>
    fun findByEventId(eventId: String, pageable: Pageable): Page<EventParticipant>
    fun countByEventId(eventId: String): Long

    @Transactional
    fun deleteByEventId(eventId: String)
}
