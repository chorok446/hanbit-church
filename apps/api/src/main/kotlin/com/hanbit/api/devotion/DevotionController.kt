package com.hanbit.api.devotion

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
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

/**
 * 데일리 큐티(오늘의 말씀·묵상) 공개 조회 + 은혜나눔 댓글.
 * 공개 GET 은 SecurityConfig 의 api 하위 permitAll, 댓글 쓰기·삭제는 authenticated 매처로 보호된다.
 */
@RestController
@Tag(name = "Devotion", description = "데일리 큐티(오늘의 말씀·묵상)와 은혜나눔 댓글")
class DevotionController(private val service: DevotionService) {
    @Operation(summary = "오늘의 말씀 — 오늘 자가 없으면 가장 최근 발행분(없으면 204)")
    @GetMapping("/api/devotions/today")
    fun today(): DevotionResponse? = service.getToday()

    @Operation(summary = "큐티 목록 — 발행분(오늘 이하)만 최신 날짜순 페이지")
    @GetMapping("/api/devotions")
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "12") size: Int,
    ): DevotionPageResponse = service.listPublic(page, size)

    @Operation(summary = "sitemap 전용 id 목록(발행분만)")
    @GetMapping("/api/devotions/sitemap-ids")
    fun sitemapIds(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "500") size: Int,
    ) = service.listSitemapIds(page, size)

    @Operation(summary = "큐티 상세 — 미래 예약분은 404")
    @GetMapping("/api/devotions/{id}")
    fun detail(@PathVariable id: String): DevotionResponse = service.getPublic(id)

    @Operation(summary = "은혜나눔 댓글 목록(오래된 순)")
    @GetMapping("/api/devotions/{id}/comments")
    fun comments(
        @PathVariable id: String,
        @AuthenticationPrincipal me: AuthUser?,
    ): List<DevotionCommentResponse> = service.listComments(id, me?.id)

    @Operation(summary = "은혜나눔 댓글 작성(로그인 교인)")
    @PostMapping("/api/devotions/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    fun addComment(
        @PathVariable id: String,
        @RequestBody request: CreateDevotionCommentRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): DevotionCommentResponse = service.addComment(id, me, request)

    @Operation(summary = "은혜나눔 댓글 삭제(본인 또는 콘텐츠 스태프)")
    @DeleteMapping("/api/devotions/{id}/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteComment(
        @PathVariable id: String,
        @PathVariable commentId: String,
        @AuthenticationPrincipal me: AuthUser,
    ) = service.deleteComment(id, commentId, me)

    // ─── 관리자(공지·주보와 동일: ADMIN/OPERATOR/CONTENT — SecurityConfig 강제) ───

    @Operation(summary = "관리자 큐티 목록 — 미래 예약분 포함")
    @GetMapping("/api/admin/devotions")
    fun adminList(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
    ): DevotionPageResponse = service.listAdmin(page, size)

    @Operation(summary = "관리자 큐티 상세(예약분 포함)")
    @GetMapping("/api/admin/devotions/{id}")
    fun adminDetail(@PathVariable id: String): DevotionResponse = service.getAdmin(id)

    @Operation(summary = "큐티 등록 — 미래 날짜면 그날 자동 공개")
    @PostMapping("/api/admin/devotions")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @RequestBody request: SaveDevotionRequest,
        @AuthenticationPrincipal me: AuthUser,
    ): DevotionResponse = service.create(me.id, request)

    @Operation(summary = "큐티 수정")
    @PutMapping("/api/admin/devotions/{id}")
    fun update(
        @PathVariable id: String,
        @RequestBody request: SaveDevotionRequest,
    ): DevotionResponse = service.update(id, request)

    @Operation(summary = "큐티 삭제(댓글 포함)")
    @DeleteMapping("/api/admin/devotions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: String) = service.delete(id)
}
