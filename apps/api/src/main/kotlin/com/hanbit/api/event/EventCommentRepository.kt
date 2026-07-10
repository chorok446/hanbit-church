package com.hanbit.api.event

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

interface EventCommentRepository : JpaRepository<EventComment, String> {
    fun findByEventId(eventId: String, pageable: Pageable): Page<EventComment>
    fun findByIdAndEventId(id: String, eventId: String): EventComment?

    // 공개 노출 경로용(숨김 제외).
    fun findByEventIdAndParentIdIsNullAndHiddenAtIsNull(eventId: String, pageable: Pageable): Page<EventComment>
    fun findByParentIdInAndHiddenAtIsNullOrderByCreatedAtAscIdAsc(parentIds: Collection<String>): List<EventComment>
    fun findByParentId(parentId: String): List<EventComment>

    // 최상위 댓글(답글 제외) 기준 딥링크 위치 계산.
    @Query(
        """
        select count(c) from EventComment c
        where c.eventId = :eventId
          and c.parentId is null
          and c.hiddenAt is null
          and (c.createdAt > :createdAt or (c.createdAt = :createdAt and c.id < :id))
        """,
    )
    fun countBeforeInNewestOrder(
        @Param("eventId") eventId: String,
        @Param("createdAt") createdAt: Instant,
        @Param("id") id: String,
    ): Long

    fun countByEventId(eventId: String): Long
    fun countByEventIdAndHiddenAtIsNull(eventId: String): Long

    @Transactional
    fun deleteByEventId(eventId: String)

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventComment c set c.author.name = :name, c.author.verified = false, c.author.profileImageUrl = null where c.authorUserId = :userId")
    fun anonymizeAuthor(@Param("userId") userId: Long, @Param("name") name: String): Int

    /** 프로필 변경 시 기존 작성물의 author snapshot(name·이미지)을 최신 값으로 맞춘다. verified 는 유지. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventComment c set c.author.name = :name, c.author.profileImageUrl = :imageUrl where c.authorUserId = :userId")
    fun syncAuthorProfile(@Param("userId") userId: Long, @Param("name") name: String, @Param("imageUrl") imageUrl: String?): Int
}
