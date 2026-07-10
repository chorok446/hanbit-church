package com.hanbit.api.event

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

/** 행사 참여자. (event_id, user_id) unique 로 중복 참여를 막는다. */
@Entity
@Table(
    name = "event_participants",
    uniqueConstraints = [UniqueConstraint(columnNames = ["event_id", "user_id"])],
    indexes = [Index(name = "idx_event_participants_user_id", columnList = "user_id")],
)
class EventParticipant(
    @Id val id: String,
    @Column(name = "event_id") val eventId: String,
    @Column(name = "user_id") val userId: Long,
)
