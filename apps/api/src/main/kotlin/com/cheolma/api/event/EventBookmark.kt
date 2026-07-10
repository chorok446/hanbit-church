package com.cheolma.api.event

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

/** 사용자별 행사 북마크. (event_id, user_id) unique 로 중복 북마크를 막는다. */
@Entity
@Table(
    name = "event_bookmarks",
    uniqueConstraints = [UniqueConstraint(columnNames = ["event_id", "user_id"])],
    indexes = [Index(name = "idx_event_bookmarks_user_id", columnList = "user_id")],
)
class EventBookmark(
    @Id val id: String,
    @Column(name = "event_id") val eventId: String,
    @Column(name = "user_id") val userId: Long,
)
