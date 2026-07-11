package com.hanbit.api.media

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.io.ByteArrayOutputStream

/**
 * webp 메타데이터 제거(RIFF 청크 스트리핑) 단위 테스트 — EXIF(GPS)·XMP 유출 차단 보안 기능.
 * ImageIO 디코더가 없는 webp 는 재인코딩 대신 청크 단위로 EXIF/XMP 만 떼어낸다.
 */
class MediaWebpMetadataTest {

    private fun le32(n: Int) =
        byteArrayOf(n.toByte(), (n shr 8).toByte(), (n shr 16).toByte(), (n shr 24).toByte())

    /** RIFF 청크 하나: fourCC(4) + size(4 LE) + payload + 홀수 크기면 1바이트 패딩. */
    private fun chunk(fourCC: String, payload: ByteArray): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(fourCC.toByteArray(Charsets.US_ASCII))
        out.write(le32(payload.size))
        out.write(payload)
        if (payload.size and 1 == 1) out.write(0)
        return out.toByteArray()
    }

    /** RIFF/WEBP 컨테이너로 감싼다. RIFF 크기 = 뒤따르는 "WEBP" + 청크 전체 길이. */
    private fun webp(vararg chunks: ByteArray): ByteArray {
        val body = ByteArrayOutputStream()
        body.write("WEBP".toByteArray(Charsets.US_ASCII))
        chunks.forEach { body.write(it) }
        val bodyBytes = body.toByteArray()
        val out = ByteArrayOutputStream()
        out.write("RIFF".toByteArray(Charsets.US_ASCII))
        out.write(le32(bodyBytes.size))
        out.write(bodyBytes)
        return out.toByteArray()
    }

    @Test
    fun `webp 의 EXIF·XMP 청크를 제거하고 VP8X 메타데이터 플래그를 정리한다`() {
        val vp8x = chunk("VP8X", ByteArray(10).also { it[0] = 0x0C }) // EXIF(0x08)+XMP(0x04) 플래그 on
        val vp8 = chunk("VP8 ", byteArrayOf(1, 2, 3, 4)) // 픽셀 데이터(더미)
        val exif = chunk("EXIF", "GPSLatitude=37.5;GPSLongitude=127.0".toByteArray())
        val xmp = chunk("XMP ", "<x:xmpmeta/>".toByteArray())
        val input = webp(vp8x, vp8, exif, xmp)

        val out = MediaUploadService.stripWebpMetadata(input)
        val text = String(out, Charsets.ISO_8859_1)

        // 메타데이터 청크와 그 페이로드(GPS 좌표)가 사라진다.
        assertThat(text).doesNotContain("EXIF")
        assertThat(text).doesNotContain("XMP ")
        assertThat(text).doesNotContain("GPSLatitude")
        // 픽셀·헤더 청크는 보존된다.
        assertThat(text).contains("VP8X")
        assertThat(text).contains("VP8 ")
        // VP8X 플래그 바이트(RIFF 12 + VP8X fourCC·size 8 = 오프셋 20)에서 EXIF/XMP 비트가 클리어된다.
        assertThat(out[20].toInt() and 0x0C).isEqualTo(0)
        // RIFF 크기 헤더가 새 본문 길이(전체 - 8)와 일치한다.
        val declared = (out[4].toInt() and 0xFF) or ((out[5].toInt() and 0xFF) shl 8) or
            ((out[6].toInt() and 0xFF) shl 16) or ((out[7].toInt() and 0xFF) shl 24)
        assertThat(declared).isEqualTo(out.size - 8)
    }

    @Test
    fun `제거할 메타데이터가 없으면 원본을 그대로 반환한다`() {
        val input = webp(chunk("VP8X", ByteArray(10)), chunk("VP8 ", byteArrayOf(9, 8, 7)))
        assertThat(MediaUploadService.stripWebpMetadata(input)).isEqualTo(input)
    }

    @Test
    fun `12바이트 미만 잘린 컨테이너는 원본 그대로 반환한다(fail-open)`() {
        val truncated = byteArrayOf(0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0) // "RIFF" + 크기만, 8바이트
        assertThat(MediaUploadService.stripWebpMetadata(truncated)).isEqualTo(truncated)
    }
}
