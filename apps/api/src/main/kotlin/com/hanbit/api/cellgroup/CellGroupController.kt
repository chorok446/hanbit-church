package com.hanbit.api.cellgroup

import com.hanbit.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * 소그룹/목장(구역) API. SecurityConfig 는 `/api/cell-groups` 하위 경로에 인증만 요구하고,
 * 그룹별 권한(매니저·리더·멤버)은 CellGroupService/CellGroupAccess 가 DB role·roster 로 검사한다.
 */
@RestController
@RequestMapping("/api/cell-groups")
@Tag(name = "CellGroup", description = "소그룹/목장(구역) — 로스터·모임 스케줄·모임기록(참석·나눔)")
class CellGroupController(
    private val service: CellGroupService,
) {
    @Operation(summary = "목장 디렉터리 — 매니저는 비활성 포함 전체, 그 외 회원은 활성만")
    @GetMapping
    fun getDirectory(@AuthenticationPrincipal me: AuthUser): List<CellGroupSummaryResponse> =
        service.getDirectory(me.id)

    @Operation(summary = "내가 속한(멤버·리더) 목장 목록")
    @GetMapping("/mine")
    fun getMine(@AuthenticationPrincipal me: AuthUser): List<CellGroupSummaryResponse> =
        service.getMine(me.id)

    @Operation(summary = "로스터 추가 후보 검색 (매니저 전용)")
    @GetMapping("/candidates")
    fun searchCandidates(
        @RequestParam(required = false) q: String?,
        @AuthenticationPrincipal me: AuthUser,
    ): List<CellGroupCandidateResponse> = service.searchCandidates(me.id, q)

    @Operation(summary = "목장 상세 — 정보·로스터·모임 (그룹 멤버·리더·매니저)")
    @GetMapping("/{id}")
    fun getGroup(@PathVariable id: String, @AuthenticationPrincipal me: AuthUser): CellGroupDetailResponse =
        service.getGroup(me.id, id)

    @Operation(summary = "목장 생성 (매니저 전용)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestBody request: SaveCellGroupRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): CellGroupDetailResponse = service.create(me.id, request)

    @Operation(summary = "목장 정보 수정 — 이름·구역·설명(리더·매니저), 리더 재지정·활성 전환은 매니저만")
    @PutMapping("/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody request: SaveCellGroupRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): CellGroupDetailResponse = service.update(me.id, id, request)

    @Operation(summary = "목장 삭제 (매니저 전용) — 로스터·모임 함께 삭제")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: String, @AuthenticationPrincipal me: AuthUser) {
        service.delete(me.id, id)
    }

    @Operation(summary = "로스터 전체 교체 (매니저 전용). 유지 멤버 joinedAt 보존, 새 멤버에 합류 알림")
    @PutMapping("/{id}/members")
    fun setMembers(
        @PathVariable id: String,
        @RequestBody request: SetCellGroupMembersRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): CellGroupDetailResponse = service.setMembers(me.id, id, request)

    @Operation(summary = "모임 생성 — 스케줄+기록(참석·나눔) (리더·매니저)")
    @PostMapping("/{id}/meetings")
    @ResponseStatus(HttpStatus.CREATED)
    fun createMeeting(
        @PathVariable id: String,
        @RequestBody request: SaveCellMeetingRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): CellMeetingResponse = service.createMeeting(me.id, id, request)

    @Operation(summary = "모임 수정 — 스케줄·참석·나눔 전체 교체 (리더·매니저)")
    @PutMapping("/{id}/meetings/{meetingId}")
    fun updateMeeting(
        @PathVariable id: String,
        @PathVariable meetingId: String,
        @RequestBody request: SaveCellMeetingRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): CellMeetingResponse = service.updateMeeting(me.id, id, meetingId, request)

    @Operation(summary = "모임 삭제 (리더·매니저)")
    @DeleteMapping("/{id}/meetings/{meetingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteMeeting(
        @PathVariable id: String,
        @PathVariable meetingId: String,
        @AuthenticationPrincipal me: AuthUser,
    ) {
        service.deleteMeeting(me.id, id, meetingId)
    }
}
