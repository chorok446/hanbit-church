package com.dasida.api.newfamily

import io.swagger.v3.oas.annotations.media.Schema
import java.time.Instant

@Schema(description = "새가족 등록 신청 요청")
data class CreateNewFamilyRequest(
    @field:Schema(description = "이름(최대 30자)")
    val name: String,
    @field:Schema(description = "연락처(최대 20자)")
    val phone: String,
    @field:Schema(description = "남기고 싶은 말(선택, 최대 500자)")
    val note: String? = null,
)

@Schema(description = "새가족 등록 신청 접수 결과")
data class CreateNewFamilyResponse(
    val id: String,
    val received: Boolean = true,
)

/** 관리자 목록 항목. 개인정보를 담으므로 관리자 API 에서만 내려간다. */
data class NewFamilyResponse(
    val id: String,
    val name: String,
    val phone: String,
    val note: String?,
    val createdAt: Instant,
    val contactedAt: Instant?,
)

data class NewFamilyPageResponse(
    val content: List<NewFamilyResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    // 아직 연락하지 않은 신청 수(대시보드 배지용).
    val pendingCount: Long,
)

@Schema(description = "연락 완료 표시 요청")
data class SetContactedRequest(
    val contacted: Boolean,
)
