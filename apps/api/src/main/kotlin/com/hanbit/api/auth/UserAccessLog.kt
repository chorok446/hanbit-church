package com.hanbit.api.auth

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(
    name = "user_access_logs",
    indexes = [Index(name = "idx_user_access_logs_user_accessed", columnList = "user_id,accessed_at")],
)
class UserAccessLog(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) val id: Long? = null,
    @Column(name = "user_id", nullable = false) val userId: Long,
    @Column(name = "ip_address", nullable = false, length = 45) val ipAddress: String,
    @Column(nullable = false, length = 32) val os: String,
    @Column(name = "accessed_at", nullable = false) val accessedAt: Instant,
    // User-Agent 기반 브라우저 이름. V21 이전 기록은 기본값("알 수 없음").
    @Column(nullable = false, length = 32) val browser: String = "알 수 없음",
    // IP 기반 대략적 위치(best-effort). 조회 실패 시 null.
    @Column(length = 64) val country: String? = null,
    @Column(length = 64) val region: String? = null,
)
