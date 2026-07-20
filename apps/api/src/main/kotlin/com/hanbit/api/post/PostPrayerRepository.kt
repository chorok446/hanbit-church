package com.hanbit.api.post

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.transaction.annotation.Transactional

interface PostPrayerRepository : JpaRepository<PostPrayer, String> {
    fun existsByPostIdAndUserId(postId: String, userId: Long): Boolean
    fun findByPostIdAndUserId(postId: String, userId: Long): PostPrayer?
    fun findByUserIdAndPostIdIn(userId: Long, postIds: Collection<String>): List<PostPrayer>

    @Transactional
    fun deleteByPostId(postId: String)
}
