package com.dasida.api.newfamily

import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/new-family")
@Tag(name = "NewFamily", description = "새가족 등록 신청")
class NewFamilyController(
    private val service: NewFamilyService,
) {
    @Operation(summary = "새가족 등록 신청 (공개, IP 레이트리밋 적용)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@RequestBody request: CreateNewFamilyRequest): CreateNewFamilyResponse =
        service.register(request)
}
