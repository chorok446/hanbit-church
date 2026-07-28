package com.hanbit.api.media

import jakarta.annotation.PostConstruct
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.nio.file.StandardCopyOption
import java.util.UUID
import javax.imageio.IIOImage
import javax.imageio.ImageIO
import javax.imageio.ImageWriteParam
import kotlin.math.roundToInt

/** storeImageOrPdf 결과 — 전용 디렉터리에 저장된 파일명과 종류(image|pdf). URL 은 인증 엔드포인트가 만든다. */
data class StoredPraiseFile(val filename: String, val kind: String)

/** readPraiseFile 결과 — 인증 서빙용 파일 본문·content-type·인라인 여부(이미지=인라인, PDF=다운로드). */
data class PraiseFileContent(val bytes: ByteArray, val contentType: String, val inline: Boolean)

@Service
class MediaUploadService(
    @param:Value("\${app.upload.dir:uploads}") private val uploadDir: String,
    @param:Value("\${app.upload.public-base-url:http://localhost:8080}") private val publicBaseUrl: String,
) {
    @PostConstruct
    fun ensureUploadDir() {
        Files.createDirectories(resolveUploadDir())
    }

    fun store(file: MultipartFile): String {
        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        val bytes = file.bytes
        if (bytes.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        if (bytes.size > MAX_BYTES) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is too large")
        }
        val extension = detectImageExtension(bytes)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported image type")

        val id = UUID.randomUUID().toString()
        val dir = resolveUploadDir()

        // 크기 상한(디컴프레션 폭탄 방어) + 메타데이터 제거. jpg/png 손상은 거절, webp 은 image=null(썸네일 생략,
        // 프론트는 썸네일 404 시 원본으로 fallback — FallbackImage thumbnail).
        val sanitized = capAndSanitizeImage(bytes, extension)
        val filename = "$id.$extension"
        Files.write(dir.resolve(filename), sanitized.bytes)
        sanitized.image?.let { writeThumbnail(it, dir.resolve("$id$THUMB_SUFFIX")) }

        val base = publicBaseUrl.trim().trimEnd('/')
        return "$base/uploads/$filename"
    }

    /**
     * 문서(주보 PDF·한글·텍스트·이미지 등) 저장. PDF 외 일반 문서도 허용하되 아래 3중 검증으로 위장 페이로드를 막는다:
     *  1) 실행형 확장자 denylist(BLOCKED_DOCUMENT_EXTENSIONS) 차단
     *  2) 확장자와 무관하게 내용이 HTML/스크립트/SVG/XML 마크업으로 보이면 차단(`bulletin.pdf` 로 위장한 HTML 등)
     *  3) 인라인 서빙되는 이미지 확장자(jpg/png/webp)는 실제 이미지 magic bytes 와 일치해야 함
     * 이미지와 달리 축소·썸네일 없이 원본 그대로 저장하고 공개 URL 을 반환한다.
     */
    fun storeDocument(file: MultipartFile): String {
        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        val bytes = file.bytes
        if (bytes.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        if (bytes.size > MAX_DOCUMENT_BYTES) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is too large")
        }
        val extension = documentExtension(file.originalFilename)
        // 1) 브라우저가 실행/렌더할 수 있는 위험 확장자 차단.
        if (extension in BLOCKED_DOCUMENT_EXTENSIONS) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported document type")
        }
        // 2) 확장자를 우회한 위장(예: HTML 을 .pdf 로 저장)을 내용 기반으로 차단. nosniff+attachment 위에 얹는 방어.
        if (looksLikeExecutableMarkup(bytes)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported document content")
        }
        // 3) 인라인 서빙 대상 이미지 확장자는 실제 이미지여야 한다(mislabeled 문서의 인라인 렌더 차단).
        if (extension in INLINE_PRAISE_IMAGE_EXTENSIONS && detectImageExtension(bytes) == null) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid image document")
        }
        val filename = "${UUID.randomUUID()}.$extension"
        Files.write(resolveUploadDir().resolve(filename), bytes)
        val base = publicBaseUrl.trim().trimEnd('/')
        return "$base/uploads/$filename"
    }

    /**
     * 찬양팀 자료(악보 사진·PDF) 저장. magic bytes 허용 목록(이미지 jpeg/png/webp 또는 PDF)만 받는다 —
     * BLOCKED_DOCUMENT_EXTENSIONS 블록리스트보다 강한 방식이라 실행형(HTML·JS 등)은 원천 차단된다.
     * 이미지 5MB·PDF 10MB. 확장자는 감지 타입으로 고정해 원본 파일명 확장자를 신뢰하지 않는다.
     *
     * 공개 uploads 가 아니라 전용 하위 디렉터리(praise/)에 저장하고 파일명만 돌려준다.
     * 서빙은 PraiseController 의 인증 엔드포인트(GET api/praise/files/{name})가 담당한다
     * — 공개 정적 리소스 경로와 겹치지 않아 URL 을 알아도 비멤버는 접근할 수 없다.
     */
    fun storeImageOrPdf(file: MultipartFile): StoredPraiseFile {
        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        val bytes = file.bytes
        if (bytes.isEmpty()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required")
        }
        val imageExt = detectImageExtension(bytes)
        val dir = resolvePraiseDir()
        return when {
            imageExt != null -> {
                if (bytes.size > MAX_BYTES) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is too large")
                }
                // 크기 상한(디컴프레션 폭탄 방어) + 메타데이터 제거. webp 은 축소 없이 RIFF 메타데이터만 떼어낸다.
                val filename = "${UUID.randomUUID()}.$imageExt"
                Files.write(dir.resolve(filename), capAndSanitizeImage(bytes, imageExt).bytes)
                StoredPraiseFile(filename = filename, kind = "image")
            }
            isPdf(bytes) -> {
                if (bytes.size > MAX_DOCUMENT_BYTES) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "file is too large")
                }
                val filename = "${UUID.randomUUID()}.pdf"
                Files.write(dir.resolve(filename), bytes)
                StoredPraiseFile(filename = filename, kind = "pdf")
            }
            else -> throw ResponseStatusException(HttpStatus.BAD_REQUEST, "unsupported file type (image or pdf only)")
        }
    }

    /**
     * 인증 서빙용 찬양팀 파일 로드. 파일명은 UUID.확장자 형태만 허용해 경로 탐색(../ 등)을 원천 차단한다.
     * 없으면 404. 반환한 [PraiseFileContent] 로 컨트롤러가 content-type·본문을 내려준다.
     */
    fun readPraiseFile(filename: String): PraiseFileContent {
        if (!SAFE_PRAISE_FILENAME.matches(filename)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "file not found")
        }
        val path = resolvePraiseDir().resolve(filename).normalize()
        // 정규화 후에도 전용 디렉터리 밖을 가리키면 거절(추가 방어).
        if (!path.startsWith(resolvePraiseDir()) || !Files.isRegularFile(path)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "file not found")
        }
        val ext = filename.substringAfterLast('.', "").lowercase()
        val contentType = when (ext) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "webp" -> "image/webp"
            "pdf" -> "application/pdf"
            else -> "application/octet-stream"
        }
        // 이미지는 인라인(미리보기), PDF 는 다운로드 유도. 어느 쪽이든 nosniff.
        val inline = ext in INLINE_PRAISE_IMAGE_EXTENSIONS
        return PraiseFileContent(bytes = Files.readAllBytes(path), contentType = contentType, inline = inline)
    }

    private fun resolvePraiseDir(): Path = resolveUploadDir().resolve(PRAISE_SUBDIR).also { Files.createDirectories(it) }

    /**
     * 교인 전용(MEMBERS) 게시글 이미지 보호 — 공개 정적 경로(/uploads/{name})의 로컬 업로드 파일을
     * 전용 하위 디렉터리(members/)로 옮기고 인증 서빙 URL(/api/media/members/{name})로 재작성한다.
     * 썸네일({id}.thumb.jpg)도 함께 옮긴다. 외부 URL·이미 보호된 URL 은 그대로 반환하므로
     * 수정 왕복(클라이언트가 기존 URL 을 되돌려 보내는 경우)에도 멱등하다.
     */
    fun protectMembersImageUrl(url: String): String {
        val base = publicBaseUrl.trim().trimEnd('/')
        val filename = url.removePrefix("$base/uploads/")
        if (filename == url || !SAFE_MEMBERS_ORIGINAL_FILENAME.matches(filename)) return url
        moveToMembersIfPresent(filename)
        moveToMembersIfPresent(filename.substringBeforeLast('.') + THUMB_SUFFIX)
        return "$base/api/media/members/$filename"
    }

    private fun moveToMembersIfPresent(filename: String) {
        val src = resolveUploadDir().resolve(filename)
        if (Files.isRegularFile(src)) {
            Files.move(src, resolveMembersDir().resolve(filename), StandardCopyOption.REPLACE_EXISTING)
        }
    }

    /**
     * 인증 서빙용 교인 전용 이미지 로드. 파일명은 UUID(.thumb)?.이미지확장자만 허용해
     * 경로 탐색을 원천 차단한다(찬양팀 readPraiseFile 과 동일 패턴). 없으면 404.
     */
    fun readMembersFile(filename: String): PraiseFileContent {
        if (!SAFE_MEMBERS_FILENAME.matches(filename)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "file not found")
        }
        val path = resolveMembersDir().resolve(filename).normalize()
        if (!path.startsWith(resolveMembersDir()) || !Files.isRegularFile(path)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "file not found")
        }
        val contentType = when (filename.substringAfterLast('.', "").lowercase()) {
            "jpg", "jpeg" -> "image/jpeg"
            "png" -> "image/png"
            "webp" -> "image/webp"
            else -> "application/octet-stream"
        }
        return PraiseFileContent(bytes = Files.readAllBytes(path), contentType = contentType, inline = true)
    }

    private fun resolveMembersDir(): Path = resolveUploadDir().resolve(MEMBERS_SUBDIR).also { Files.createDirectories(it) }

    /** 저장용 정제 결과 — 정제된 바이트와 (썸네일 생성용) 디코드된 이미지(webp·디코드 불가 시 null). */
    private data class SanitizedImage(val bytes: ByteArray, val image: BufferedImage?)

    /**
     * 크기 상한 검사 + 메타데이터 제거 재인코딩. jpg/png 는 **전체 디코드 전에** 헤더에서 크기를 읽어
     * 상한(한 변 MAX_IMAGE_DIM · 총 픽셀 MAX_IMAGE_PIXELS)을 넘으면 거절한다 — 작은 압축 파일이 수억 픽셀로
     * 팽창해 JVM heap 을 고갈시키는 디컴프레션 폭탄을 막는다. 총 픽셀 상한이 핵심 방어선이다: progressive JPEG 은
     * 서브샘플과 무관하게 full-res DCT 계수 버퍼를 먼저 잡으므로 한 변 상한만으로는 메모리가 제한되지 않기 때문이다.
     * 통과분은 subsample 디코드로 출력 raster 를 목표 크기 수준으로 낮춘다. EXIF(GPS·기기)·PNG 텍스트 청크는
     * 재인코딩으로 제거된다(프라이버시). MAX_ORIGINAL_DIM 초과분은 축소.
     * 헤더를 못 읽거나(손상) 디코드 불가(CMYK 등 ImageIO 미지원 color model)면 상한 위반이 아닌 정상 파일로 보고
     * 원본을 그대로 저장한다(CLAUDE.md '디코딩 실패만 원본 저장' 계약 — 400 은 상한 초과에만).
     * webp 은 ImageIO 디코더가 없어 재인코딩 불가 — RIFF 헤더에서 캔버스 크기만 읽어 같은 상한을 적용(클라이언트 렌더 폭탄 방어)하고 메타데이터만 떼어낸다.
     */
    private fun capAndSanitizeImage(bytes: ByteArray, extension: String): SanitizedImage {
        if (extension == "webp") {
            readWebpDimensions(bytes)?.let { (w, h) -> requireWithinPixelLimits(w, h) }
            return SanitizedImage(stripWebpMetadata(bytes), image = null)
        }
        // jpg/png: 헤더 크기 검사(폭탄 차단) 후 subsample 디코드. 헤더 손상·디코드 불가(CMYK 등)면 null → 원본 저장.
        val image = decodeWithinLimitsOrNull(bytes)
            ?: return SanitizedImage(bytes, image = null)
        val format = if (extension == "png") "png" else "jpg"
        val scaled = scaleToFit(image, MAX_ORIGINAL_DIM, keepAlpha = format == "png")
        return SanitizedImage(encodeOrNull(scaled, format) ?: bytes, image)
    }

    /**
     * 한 리더로 헤더 크기 검사와 디코드를 함께 처리한다(헤더 이중 파싱 방지).
     * - 리더 없음/헤더 손상/디코드 불가(CMYK 등) → null(호출부가 원본 저장 fallback — 400 아님).
     * - 크기가 상한(requireWithinPixelLimits) 초과 → 400(폭탄).
     * read 의 catch 는 Exception 만 삼키고 OutOfMemoryError 등 Error 는 전파해 폭탄을 원본으로 저장하지 않는다.
     */
    private fun decodeWithinLimitsOrNull(bytes: ByteArray): BufferedImage? {
        val iis = ImageIO.createImageInputStream(ByteArrayInputStream(bytes)) ?: return null
        return iis.use {
            val readers = ImageIO.getImageReaders(it)
            if (!readers.hasNext()) return@use null
            val reader = readers.next()
            try {
                reader.input = it
                val width: Int
                val height: Int
                try {
                    width = reader.getWidth(0)
                    height = reader.getHeight(0)
                } catch (_: Exception) {
                    return@use null // 헤더 손상 → 원본 저장 fallback
                }
                requireWithinPixelLimits(width, height) // 상한 초과면 여기서 400
                // 목표 축소 배율(정수) — 디코드 시점에 픽셀을 건너뛰어 출력 raster 메모리를 원본 크기와 무관하게 제한한다.
                val step = maxOf(1, maxOf(width, height) / MAX_ORIGINAL_DIM)
                val param = reader.defaultReadParam.apply {
                    if (step > 1) setSourceSubsampling(step, step, 0, 0)
                }
                try {
                    reader.read(0, param)
                } catch (_: Exception) {
                    null // 디코드 불가(CMYK 등 미지원 color model) → 원본 저장 fallback
                }
            } finally {
                reader.dispose()
            }
        }
    }

    /**
     * 헤더에서 읽은 크기가 디컴프레션 폭탄 상한을 넘으면 400 으로 거절한다.
     * 한 변(MAX_IMAGE_DIM)과 총 픽셀 수(MAX_IMAGE_PIXELS)를 함께 본다 — 총 픽셀 상한이 실제 메모리 방어선이고,
     * 한 변 상한은 극단적으로 가늘고 긴 이미지를 거르는 보조 가드다.
     */
    private fun requireWithinPixelLimits(width: Int, height: Int) {
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM ||
            width.toLong() * height.toLong() > MAX_IMAGE_PIXELS
        ) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "image dimensions too large")
        }
    }

    /** webp(RIFF) 헤더에서 캔버스 (width, height) 를 읽는다. VP8X/VP8/VP8L 만 지원하며 파싱 불가면 null. */
    private fun readWebpDimensions(bytes: ByteArray): Pair<Int, Int>? {
        fun ascii(off: Int, s: String) = off + s.length <= bytes.size && s.indices.all { bytes[off + it] == s[it].code.toByte() }
        fun u8(i: Int) = bytes[i].toInt() and 0xFF
        if (bytes.size < 30 || !ascii(0, "RIFF") || !ascii(8, "WEBP")) return null
        return when (String(bytes, 12, 4, Charsets.US_ASCII)) {
            // VP8X: flags(20)+reserved(21..23), width-1 LE24(24..26), height-1 LE24(27..29).
            "VP8X" -> ((u8(24) or (u8(25) shl 8) or (u8(26) shl 16)) + 1) to ((u8(27) or (u8(28) shl 8) or (u8(29) shl 16)) + 1)
            // VP8(lossy): keyframe 크기 14-bit at 26..29.
            "VP8 " -> ((u8(26) or (u8(27) shl 8)) and 0x3FFF) to ((u8(28) or (u8(29) shl 8)) and 0x3FFF)
            // VP8L(lossless): signature 0x2f at 20, 그다음 14-bit width-1, 14-bit height-1.
            "VP8L" -> if (u8(20) != 0x2f) null else (((u8(22) and 0x3F) shl 8 or u8(21)) + 1) to
                ((((u8(24) and 0x0F) shl 10) or (u8(23) shl 2) or ((u8(22) and 0xC0) shr 6)) + 1)
            else -> null
        }
    }

    /** jpg 는 명시 품질(JPEG_QUALITY)로, png 는 기본 인코더로 재인코딩한다. 실패 시 null. */
    private fun encodeOrNull(image: BufferedImage, format: String): ByteArray? = runCatching {
        val out = ByteArrayOutputStream()
        if (format == "jpg") {
            val writer = ImageIO.getImageWritersByFormatName("jpg").next()
            try {
                val param = writer.defaultWriteParam.apply {
                    compressionMode = ImageWriteParam.MODE_EXPLICIT
                    compressionQuality = JPEG_QUALITY
                }
                ImageIO.createImageOutputStream(out).use { ios ->
                    writer.output = ios
                    writer.write(null, IIOImage(image, null, null), param)
                }
            } finally {
                writer.dispose()
            }
            out.toByteArray()
        } else {
            if (ImageIO.write(image, format, out)) out.toByteArray() else null
        }
    }.getOrNull()

    /** 목록 화면용 `<name>.thumb.jpg` 생성. best-effort — 실패해도 업로드는 성공 처리한다. */
    private fun writeThumbnail(image: BufferedImage, target: Path) {
        runCatching {
            val scaled = scaleToFit(image, THUMB_MAX_DIM, keepAlpha = false)
            val out = ByteArrayOutputStream()
            if (ImageIO.write(scaled, "jpg", out)) {
                Files.write(target, out.toByteArray())
            }
        }
    }

    /** 긴 변 기준 maxDim 이하로 축소(확대 없음). JPEG 인코딩용은 투명도를 흰 배경에 합성한다. */
    private fun scaleToFit(src: BufferedImage, maxDim: Int, keepAlpha: Boolean): BufferedImage {
        val ratio = minOf(1.0, maxDim.toDouble() / maxOf(src.width, src.height))
        val width = maxOf(1, (src.width * ratio).roundToInt())
        val height = maxOf(1, (src.height * ratio).roundToInt())
        val type = if (keepAlpha) BufferedImage.TYPE_INT_ARGB else BufferedImage.TYPE_INT_RGB
        val out = BufferedImage(width, height, type)
        val g = out.createGraphics()
        try {
            if (!keepAlpha) {
                g.color = Color.WHITE
                g.fillRect(0, 0, width, height)
            }
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR)
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            g.drawImage(src, 0, 0, width, height, null)
        } finally {
            g.dispose()
        }
        return out
    }

    private fun resolveUploadDir(): Path = Paths.get(uploadDir).toAbsolutePath().normalize()

    companion object {
        private const val MAX_BYTES = 5 * 1024 * 1024

        /** 문서(PDF) 한도. 스캔 주보도 수 MB 수준이라 10MB 면 넉넉하다. multipart 한도(12MB)보다 작게 유지할 것. */
        private const val MAX_DOCUMENT_BYTES = 10 * 1024 * 1024

        /** 찬양팀 파일 전용 하위 디렉터리. 공개 정적 uploads 핸들러와 별개로 인증 서빙만 접근한다. */
        internal const val PRAISE_SUBDIR = "praise"

        /** 찬양팀 파일명 허용 패턴 — UUID.확장자. 경로 탐색·임의 파일 읽기 방지. */
        internal val SAFE_PRAISE_FILENAME =
            Regex("^[0-9a-fA-F-]{36}\\.(jpg|jpeg|png|webp|pdf)$")

        /** 인증 서빙 시 인라인(미리보기) 허용 이미지 확장자. PDF 는 다운로드. */
        internal val INLINE_PRAISE_IMAGE_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp")

        /** 교인 전용 게시글 이미지 하위 디렉터리. 공개 정적 uploads 핸들러와 별개로 인증 서빙만 접근한다. */
        internal const val MEMBERS_SUBDIR = "members"

        /** members/ 로 옮길 원본 파일명 패턴 — store() 가 만드는 UUID.이미지확장자. */
        internal val SAFE_MEMBERS_ORIGINAL_FILENAME =
            Regex("^[0-9a-fA-F-]{36}\\.(jpg|jpeg|png|webp)$")

        /** 인증 서빙 허용 파일명 패턴 — 원본 + 썸네일({id}.thumb.jpg). 경로 탐색 방지. */
        internal val SAFE_MEMBERS_FILENAME =
            Regex("^[0-9a-fA-F-]{36}(\\.thumb)?\\.(jpg|jpeg|png|webp)$")

        /** 원본 파일명에서 저장용 확장자를 뽑는다(영숫자 1~8자만, 없으면 bin). */
        internal fun documentExtension(originalFilename: String?): String {
            val ext = originalFilename?.substringAfterLast('.', "")?.lowercase()?.trim().orEmpty()
            return if (Regex("^[a-z0-9]{1,8}$").matches(ext)) ext else "bin"
        }

        /**
         * /uploads 로 그대로 서빙되므로 브라우저 실행/렌더형 확장자는 차단한다.
         * 2차 방어로 UploadSecurityHeadersFilter 가 문서 응답에 Content-Disposition: attachment 를 강제한다.
         */
        internal val BLOCKED_DOCUMENT_EXTENSIONS = setOf(
            "html", "htm", "xhtml", "xht", "shtml", "shtm", "stm", "mhtml", "mht", "hta",
            "svg", "svgz", "xml", "xsl", "swf",
            "js", "mjs", "jse", "css", "vbs", "vbscript", "ps1", "wsf", "wsh", "reg",
            "php", "phtml", "phar", "pht", "jsp", "jspx",
            "jar", "class", "dll",
            "sh", "bat", "cmd", "exe", "com", "scr", "htaccess",
        )

        /**
         * 내용이 브라우저에서 실행/렌더될 수 있는 마크업(HTML·스크립트·SVG·XML)인지 앞부분으로 판별한다.
         * 확장자를 우회한 위장 페이로드(HTML 을 .pdf/.txt 로 저장)를 차단한다.
         */
        internal fun looksLikeExecutableMarkup(bytes: ByteArray): Boolean {
            val head = String(bytes, 0, minOf(bytes.size, 1024), Charsets.UTF_8)
                .trimStart('﻿', ' ', '\t', '\r', '\n')
                .lowercase()
            return MARKUP_MARKERS.any { it in head }
        }

        private val MARKUP_MARKERS = listOf(
            "<!doctype html", "<html", "<head", "<body", "<script", "<svg", "<?xml", "<iframe", "<object", "<embed",
        )

        /** %PDF- magic bytes. */
        internal fun isPdf(bytes: ByteArray): Boolean =
            bytes.size >= 5 &&
                bytes[0] == '%'.code.toByte() &&
                bytes[1] == 'P'.code.toByte() &&
                bytes[2] == 'D'.code.toByte() &&
                bytes[3] == 'F'.code.toByte() &&
                bytes[4] == '-'.code.toByte()

        /**
         * 한 변 상한(보조 가드) — 가늘고 긴 극단 이미지를 거른다. 총 픽셀 상한과 함께 헤더에서 검사한다.
         */
        internal const val MAX_IMAGE_DIM = 30_000

        /**
         * 총 픽셀 상한(디컴프레션 폭탄 핵심 방어선) — 60MP. 헤더 크기로 디코드 전에 검사한다.
         * 정상 폰 카메라 원본(12MP·48MP·50MP)은 통과하고, 900MP 급 폭탄은 거절한다.
         * progressive JPEG 은 subsample 로도 full-res DCT 계수 버퍼를 잡으므로 이 상한이 유일한 메모리 방어다.
         * ponytail: 60MP progressive 는 계수 버퍼가 ~360MB — 동시성은 media rate limit 으로 제한. 부하가 커지면 상한을 낮추거나 progressive 감지 후 별도 컷.
         */
        internal const val MAX_IMAGE_PIXELS = 60_000_000L

        /** 원본 저장 시 긴 변 상한. 이보다 크면 축소 재인코딩한다. */
        internal const val MAX_ORIGINAL_DIM = 1920

        /** jpg 재인코딩 품질. ImageIO 기본(0.75)보다 높여 메타데이터 제거 재인코딩의 화질 손실을 줄인다. */
        private const val JPEG_QUALITY = 0.85f

        /** webp(RIFF) 컨테이너에서 제거할 메타데이터 청크. ICCP(색 프로파일)는 표현에 필요해 유지한다. */
        private val WEBP_METADATA_CHUNKS = setOf("EXIF", "XMP ")

        /** VP8X 확장 플래그에서 EXIF(0x08)·XMP(0x04) 비트 — 청크 제거 시 함께 클리어해야 한다. */
        private const val WEBP_VP8X_METADATA_FLAGS = 0x0C

        /**
         * webp 은 ImageIO 디코더가 없어 재인코딩할 수 없으므로 RIFF 청크 단위로 파싱해
         * EXIF/XMP 메타데이터 청크를 떼어내고 VP8X 플래그를 정리한다(픽셀 데이터는 무손실 유지).
         * 컨테이너 구조가 예상과 다르거나 잘린 파일이면 원본을 그대로 반환한다(fail-open).
         */
        internal fun stripWebpMetadata(bytes: ByteArray): ByteArray {
            if (bytes.size < 12) return bytes
            val kept = mutableListOf<ByteArray>()
            var removedAny = false
            var pos = 12
            while (pos + 8 <= bytes.size) {
                val fourCC = String(bytes, pos, 4, Charsets.US_ASCII)
                val size = (bytes[pos + 4].toInt() and 0xFF) or
                    ((bytes[pos + 5].toInt() and 0xFF) shl 8) or
                    ((bytes[pos + 6].toInt() and 0xFF) shl 16) or
                    ((bytes[pos + 7].toInt() and 0xFF) shl 24)
                if (size < 0) return bytes
                val total = 8 + size + (size and 1) // 홀수 크기 청크는 1바이트 패딩
                if (pos + total > bytes.size) return bytes
                if (fourCC in WEBP_METADATA_CHUNKS) {
                    removedAny = true
                } else {
                    kept += bytes.copyOfRange(pos, pos + total)
                }
                pos += total
            }
            if (!removedAny) return bytes
            val bodySize = 4 + kept.sumOf { it.size }
            val out = ByteArrayOutputStream(8 + bodySize)
            out.write("RIFF".toByteArray(Charsets.US_ASCII))
            out.write(byteArrayOf(bodySize.toByte(), (bodySize shr 8).toByte(), (bodySize shr 16).toByte(), (bodySize shr 24).toByte()))
            out.write("WEBP".toByteArray(Charsets.US_ASCII))
            for (chunk in kept) {
                if (chunk.size > 8 && String(chunk, 0, 4, Charsets.US_ASCII) == "VP8X") {
                    chunk[8] = (chunk[8].toInt() and WEBP_VP8X_METADATA_FLAGS.inv()).toByte()
                }
                out.write(chunk)
            }
            return out.toByteArray()
        }

        /** 목록 썸네일 긴 변. 피드 카드(≈600px 폭)까지 커버하는 크기. */
        internal const val THUMB_MAX_DIM = 640

        /** 원본 `<uuid>.<ext>` 옆에 저장되는 썸네일 파일명 접미사. 프론트 uploadThumbUrl 과 규약을 공유한다. */
        internal const val THUMB_SUFFIX = ".thumb.jpg"

        /** magic bytes 로 jpeg/png/webp 만 허용. SVG 등은 XSS·스크립트 위험으로 제외. */
        internal fun detectImageExtension(bytes: ByteArray): String? = when {
            bytes.size >= 3 &&
                bytes[0] == 0xFF.toByte() &&
                bytes[1] == 0xD8.toByte() &&
                bytes[2] == 0xFF.toByte() -> "jpg"
            bytes.size >= 8 &&
                bytes[0] == 0x89.toByte() &&
                bytes[1] == 0x50.toByte() &&
                bytes[2] == 0x4E.toByte() &&
                bytes[3] == 0x47.toByte() -> "png"
            bytes.size >= 12 &&
                bytes[0] == 'R'.code.toByte() &&
                bytes[1] == 'I'.code.toByte() &&
                bytes[2] == 'F'.code.toByte() &&
                bytes[3] == 'F'.code.toByte() &&
                bytes[8] == 'W'.code.toByte() &&
                bytes[9] == 'E'.code.toByte() &&
                bytes[10] == 'B'.code.toByte() &&
                bytes[11] == 'P'.code.toByte() -> "webp"
            else -> null
        }
    }
}
