package com.cheolma.api.newfamily

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.Instant

/**
 * 새가족 등록 신청. 비로그인 방문자도 남길 수 있는 연락 요청이므로 회원(User)과 연결하지 않는다.
 * 개인정보(이름·연락처)를 담으므로 조회는 관리자 전용이다.
 */
@Entity
@Table(
    name = "new_family_registrations",
    indexes = [Index(name = "idx_new_family_created_at", columnList = "created_at")],
)
class NewFamilyRegistration(
    @Id val id: String,
    @Column(nullable = false, length = 30) val name: String,
    @Column(nullable = false, length = 20) val phone: String,
    @Column(columnDefinition = "TEXT") val note: String?,
    @Column(name = "created_at", nullable = false) val createdAt: Instant,
    // 교역자가 연락을 마치면 표시한다. null = 대기.
    @Column(name = "contacted_at") var contactedAt: Instant? = null,
)
