package com.hanbit.api.post

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

/**
 * '함께 기도했어요' 반응(PRAYER 전용). (post_id, user_id) unique 로 중복 반응을 막는다 — 좋아요(PostLike)와 동형.
 * 익명 집계라 반응 자체는 외부에 드러내지 않고 posts.prayed_count 카운터와 '내가 눌렀는지' 판정에만 쓴다.
 */
@Entity
@Table(name = "post_prayers", uniqueConstraints = [UniqueConstraint(columnNames = ["post_id", "user_id"])])
class PostPrayer(
    @Id val id: String,
    @Column(name = "post_id") val postId: String,
    @Column(name = "user_id") val userId: Long,
)
