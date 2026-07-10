package com.hanbit.api.newfamily

import com.hanbit.api.common.checkPageParams
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.util.UUID

@Service
class NewFamilyService(
    private val repo: NewFamilyRepository,
    private val clock: Clock,
) {
    /** 공개 등록 신청. 스팸은 IP 레이트리밋(ContentWriteRateLimitFilter)이 1차 방어한다. */
    @Transactional
    fun register(request: CreateNewFamilyRequest): CreateNewFamilyResponse {
        val name = request.name.trim()
        if (name.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required")
        if (name.length > MAX_NAME) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "name is too long")

        val phone = request.phone.trim()
        if (phone.isBlank()) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "phone is required")
        if (phone.length > MAX_PHONE || !PHONE_RE.matches(phone)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid phone")
        }

        val note = request.note?.trim()?.ifEmpty { null }
        if (note != null && note.length > MAX_NOTE) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "note is too long")
        }

        val saved = repo.save(
            NewFamilyRegistration(
                id = "nf-${UUID.randomUUID()}",
                name = name,
                phone = phone,
                note = note,
                createdAt = Instant.now(clock),
            ),
        )
        return CreateNewFamilyResponse(id = saved.id)
    }

    @Transactional(readOnly = true)
    fun getRegistrations(pendingOnly: Boolean, page: Int, size: Int): NewFamilyPageResponse {
        checkPageParams(page, size, MAX_PAGE_SIZE)
        val pageable = PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id")))
        val result = if (pendingOnly) repo.findByContactedAtIsNull(pageable) else repo.findAll(pageable)
        return NewFamilyPageResponse(
            content = result.content.map { it.toResponse() },
            page = result.number,
            size = result.size,
            totalElements = result.totalElements,
            totalPages = result.totalPages,
            pendingCount = repo.countByContactedAtIsNull(),
        )
    }

    /** 연락 완료/해제 표시. 멱등 — 같은 상태 재요청은 변화 없이 현재 상태를 반환한다. */
    @Transactional
    fun setContacted(id: String, contacted: Boolean): NewFamilyResponse {
        val registration = repo.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "registration $id not found")
        }
        if (contacted && registration.contactedAt == null) {
            registration.contactedAt = Instant.now(clock)
        } else if (!contacted) {
            registration.contactedAt = null
        }
        return registration.toResponse()
    }

    private fun NewFamilyRegistration.toResponse() = NewFamilyResponse(
        id = id, name = name, phone = phone, note = note, createdAt = createdAt, contactedAt = contactedAt,
    )

    private companion object {
        const val MAX_NAME = 30
        const val MAX_PHONE = 20
        const val MAX_NOTE = 500
        const val MAX_PAGE_SIZE = 100
        val PHONE_RE = Regex("""^[0-9+\-() ]{7,20}$""")
    }
}
