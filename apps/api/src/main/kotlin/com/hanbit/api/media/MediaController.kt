package com.hanbit.api.media

import com.hanbit.api.security.AuthUser
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/media")
@Tag(name = "Media", description = "이미지 업로드 API")
class MediaController(
    private val uploads: MediaUploadService,
) {
    @Operation(summary = "이미지 업로드", description = "jpeg/png/webp 파일을 로컬 디스크에 저장하고 공개 URL을 반환한다.")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping(consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun upload(
        @RequestParam("file") file: MultipartFile,
        @AuthenticationPrincipal user: AuthUser,
    ): MediaUploadResponse = MediaUploadResponse(url = uploads.store(file))

    @Operation(summary = "문서 업로드(관리자)", description = "공지·주보 첨부용 PDF 를 저장하고 공개 URL을 반환한다. ROLE_ADMIN 전용(SecurityConfig).")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping("/document", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun uploadDocument(
        @RequestParam("file") file: MultipartFile,
        @AuthenticationPrincipal user: AuthUser,
    ): MediaUploadResponse = MediaUploadResponse(url = uploads.storeDocument(file))

    @Operation(
        summary = "교인 전용 게시글 이미지 인증 서빙",
        description = "교인만 공개(MEMBERS) 게시글의 이미지를 스트리밍한다. 로그인(승인 교인)만 접근 가능(SecurityConfig).",
    )
    @SecurityRequirement(name = "bearerAuth")
    @GetMapping("/members/{filename}")
    fun getMembersFile(
        @PathVariable filename: String,
        @AuthenticationPrincipal user: AuthUser,
    ): ResponseEntity<ByteArray> {
        val content = uploads.readMembersFile(filename)
        return ResponseEntity.ok()
            .header("Content-Type", content.contentType)
            .header("X-Content-Type-Options", "nosniff")
            .header("Content-Disposition", "inline")
            // 교인 전용 자료라 공유 캐시(프록시·CDN)에는 저장하지 않는다. 브라우저 개인 캐시만 짧게 허용.
            .header("Cache-Control", "private, max-age=300")
            .body(content.bytes)
    }
}
