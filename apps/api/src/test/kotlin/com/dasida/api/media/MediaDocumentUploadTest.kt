package com.dasida.api.media

import com.dasida.api.auth.User
import com.dasida.api.auth.UserRepository
import com.dasida.api.auth.UserRole
import com.dasida.api.security.AuthCookies
import com.dasida.api.security.JwtService
import jakarta.servlet.http.Cookie
import org.assertj.core.api.Assertions.assertThat
import org.hamcrest.Matchers.endsWith
import org.hamcrest.Matchers.startsWith
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MediaDocumentUploadTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val users: UserRepository,
    @param:Autowired val jwt: JwtService,
) {
    private fun authCookie(user: User) = Cookie(AuthCookies.NAME, jwt.issue(user))

    private fun admin(): User =
        users.saveAndFlush(
            User(email = "doc-admin-${System.nanoTime()}@dasida.com", passwordHash = "h", name = "관리자")
                .apply { role = UserRole.ADMIN.name },
        )

    private val pdfBytes = "%PDF-1.4\n%test pdf body".toByteArray()

    @Test
    fun `관리자는 PDF 문서를 업로드할 수 있다`() {
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "주보.pdf", "application/pdf", pdfBytes))
                .cookie(authCookie(admin())),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.url").value(startsWith("http://localhost:8080/uploads/")))
            .andExpect(jsonPath("$.url").value(endsWith(".pdf")))
    }

    @Test
    fun `일반 사용자의 문서 업로드는 403`() {
        val user = users.saveAndFlush(User(email = "doc-user@dasida.com", passwordHash = "h", name = "성도"))
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "a.pdf", "application/pdf", pdfBytes))
                .cookie(authCookie(user)),
        ).andExpect(status().isForbidden)
    }

    @Test
    fun `PDF 외 일반 파일(한글·텍스트 등)도 업로드할 수 있다`() {
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "안내문.txt", "text/plain", "일반 문서".toByteArray()))
                .cookie(authCookie(admin())),
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.url").value(endsWith(".txt")))
    }

    @Test
    fun `실행형 확장자(html 등)는 400`() {
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "evil.html", "text/html", "<script>1</script>".toByteArray()))
                .cookie(authCookie(admin())),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `pdf 확장자로 위장한 HTML 은 내용 스니핑으로 400`() {
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "bulletin.pdf", "application/pdf", "<html><script>alert(1)</script></html>".toByteArray()))
                .cookie(authCookie(admin())),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `png 확장자지만 이미지가 아니면 400`() {
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "fake.png", "image/png", "not an image".toByteArray()))
                .cookie(authCookie(admin())),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `10MB 초과 문서는 400`() {
        val big = ByteArray(10 * 1024 * 1024 + 1).also {
            "%PDF-".toByteArray().copyInto(it)
        }
        mvc.perform(
            multipart("/api/media/document")
                .file(MockMultipartFile("file", "big.pdf", "application/pdf", big))
                .cookie(authCookie(admin())),
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `PDF magic bytes 검증`() {
        assertThat(MediaUploadService.isPdf(pdfBytes)).isTrue()
        assertThat(MediaUploadService.isPdf("PDF-1.4".toByteArray())).isFalse()
        assertThat(MediaUploadService.isPdf(ByteArray(0))).isFalse()
    }
}
