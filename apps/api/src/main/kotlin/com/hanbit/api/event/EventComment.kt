package com.hanbit.api.event

import com.hanbit.api.post.Author
import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(
    name = "event_comments",
    indexes = [
        Index(
            name = "idx_event_comments_event_created",
            columnList = "event_id, created_at",
        ),
    ],
)
class EventComment(
    @Id val id: String,
    @Column(name = "event_id") val eventId: String,
    @Embedded val author: Author,
    @Column(columnDefinition = "TEXT") var text: String,
    @Column(name = "created_at") val createdAt: Instant,
    @Column(name = "author_user_id") @JsonIgnore val authorUserId: Long? = null,
    @Column(name = "updated_at") var updatedAt: Instant? = null,
    // 관리자 숨김(soft hide). null = 공개.
    @Column(name = "hidden_at") @JsonIgnore var hiddenAt: Instant? = null,
    @Column(name = "hidden_reason", length = 500) @JsonIgnore var hiddenReason: String? = null,
    // 답글(1단계). null = 최상위 댓글. 답글의 답글은 허용하지 않는다.
    @Column(name = "parent_id") val parentId: String? = null,
    // 작성자 삭제(soft delete). 삭제 시 hiddenAt 도 함께 세팅해 노출 제외를 재사용한다.
    @Column(name = "deleted_at") @JsonIgnore var deletedAt: Instant? = null,
)
