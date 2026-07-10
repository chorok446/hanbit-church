package com.hanbit.api.event

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.transaction.annotation.Transactional

interface EventProofRepository : JpaRepository<EventProof, String> {
    fun findByEventIdAndHiddenAtIsNull(eventId: String, pageable: Pageable): Page<EventProof>
    fun findByIdAndEventId(id: String, eventId: String): EventProof?

    // 숨김 여부와 무관하게 판단한다(unique 제약과 동일 기준). 숨김된 인증도 재작성을 막는다.
    fun existsByEventIdAndAuthorUserId(eventId: String, authorUserId: Long): Boolean

    @Transactional
    fun deleteByEventId(eventId: String)

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventProof p set p.author.name = :name, p.author.verified = false, p.author.profileImageUrl = null where p.authorUserId = :userId")
    fun anonymizeAuthor(@Param("userId") userId: Long, @Param("name") name: String): Int

    /** 프로필 변경 시 기존 작성물의 author snapshot(name·이미지)을 최신 값으로 맞춘다. verified 는 유지. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update EventProof p set p.author.name = :name, p.author.profileImageUrl = :imageUrl where p.authorUserId = :userId")
    fun syncAuthorProfile(@Param("userId") userId: Long, @Param("name") name: String, @Param("imageUrl") imageUrl: String?): Int
}
