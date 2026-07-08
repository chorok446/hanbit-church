package com.dasida.api.newfamily

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository

interface NewFamilyRepository : JpaRepository<NewFamilyRegistration, String> {
    fun findByContactedAtIsNull(pageable: Pageable): Page<NewFamilyRegistration>
    fun countByContactedAtIsNull(): Long
}
