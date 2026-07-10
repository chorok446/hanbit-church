package com.hanbit.api.event

import com.hanbit.api.post.Author
import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes
import java.time.Instant

/**
 * 행사 참여 후기(후기). 참여자가 행사에서 실제로 한 일을 사진과 소감으로 남긴다.
 * 1인 1인증(event_id + author_user_id unique). 수정은 없고 삭제 후 재작성한다.
 */
@Entity
@Table(
    name = "event_proofs",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_event_proofs_event_author",
            columnNames = ["event_id", "author_user_id"],
        ),
    ],
    indexes = [
        Index(
            name = "idx_event_proofs_event_created",
            columnList = "event_id, created_at",
        ),
        // 계정 삭제 익명화·프로필 동기화의 author-first UPDATE 용. uk 는 event-first 라 못 쓴다.
        Index(name = "idx_event_proofs_author_user_id", columnList = "author_user_id"),
    ],
)
class EventProof(
    @Id val id: String,
    @Column(name = "event_id") val eventId: String,
    @Embedded val author: Author,
    @Column(columnDefinition = "TEXT") val text: String,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") val images: List<String>,
    @Column(name = "created_at") val createdAt: Instant,
    @Column(name = "author_user_id") @JsonIgnore val authorUserId: Long,
    // 관리자 숨김(soft hide). null = 공개.
    @Column(name = "hidden_at") @JsonIgnore var hiddenAt: Instant? = null,
    @Column(name = "hidden_reason", length = 500) @JsonIgnore var hiddenReason: String? = null,
)
