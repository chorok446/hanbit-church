package com.hanbit.api.media

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import com.hanbit.api.auth.User
import com.hanbit.api.security.JwtService
import org.springframework.http.MediaType
import java.awt.image.BufferedImage
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

/**
 * 교인 전용(MEMBERS) 게시글 이미지 인증 서빙 왕복.
 * 업로드 → MEMBERS 기도글 생성 시 URL 이 /api/media/members/ 로 재작성되고 파일이 members/ 로 이동,
 * 인증 서빙은 로그인만 허용, 공개 정적 경로(uploads/members 하위)는 차단되는지 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MembersImageServingTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
) {
    private val token = jwt.issue(User(id = 1, email = "t@t.com", passwordHash = "x", name = "테스터"))
    private val token2 = jwt.issue(User(id = 2, email = "u2@t.com", passwordHash = "x", name = "다른이"))

    private fun pngBytes(): ByteArray {
        val image = BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB)
        return ByteArrayOutputStream().also { ImageIO.write(image, "png", it) }.toByteArray()
    }

    private fun uploadImage(): String {
        val body = mvc.perform(
            multipart("/api/media")
                .file(MockMultipartFile("file", "a.png", "image/png", pngBytes()))
                .header("Authorization", "Bearer $token"),
        ).andExpect(status().isOk).andReturn().response.contentAsString
        return com.fasterxml.jackson.databind.ObjectMapper().readTree(body)["url"].asText()
    }

    private fun createPost(bodyJson: String): com.fasterxml.jackson.databind.JsonNode {
        val body = mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = bodyJson
        }.andExpect { status { isCreated() } }.andReturn().response.contentAsString
        return com.fasterxml.jackson.databind.ObjectMapper().readTree(body)
    }

    @Test
    fun `교인만 공개 글의 업로드 이미지는 인증 서빙 URL 로 재작성되고 로그인만 접근할 수 있다`() {
        val uploadedUrl = uploadImage()
        val created = createPost(
            """{"text":"교인만 보는 기도","category":"PRAYER","visibility":"MEMBERS","images":["$uploadedUrl"]}""",
        )
        val imageUrl = created["images"][0].asText()
        org.assertj.core.api.Assertions.assertThat(imageUrl).contains("/api/media/members/")

        val filename = imageUrl.substringAfterLast('/')
        val servePath = "/api/media/members/$filename"

        // 비로그인 → 401, 로그인(다른 교인) → 200 이미지.
        mvc.get(servePath).andExpect { status { isUnauthorized() } }
        mvc.get(servePath) {
            headers { add("Authorization", "Bearer $token2") }
        }.andExpect {
            status { isOk() }
            header { string("Content-Type", "image/png") }
            header { string("X-Content-Type-Options", "nosniff") }
        }

        // 썸네일도 함께 이동돼 인증 서빙으로 접근된다.
        val thumbName = filename.substringBeforeLast('.') + ".thumb.jpg"
        mvc.get("/api/media/members/$thumbName") {
            headers { add("Authorization", "Bearer $token2") }
        }.andExpect { status { isOk() } }

        // 공개 정적 경로로는 로그인해도 접근 불가(denyAll) — URL 만 알아도 못 본다.
        mvc.get("/uploads/members/$filename") {
            headers { add("Authorization", "Bearer $token2") }
        }.andExpect { status { isForbidden() } }
        // 원래 공개 경로의 파일은 이동돼 사라졌다.
        mvc.get("/uploads/$filename").andExpect { status { isNotFound() } }
    }

    @Test
    fun `공개 글의 업로드 이미지 URL 은 재작성하지 않는다`() {
        val uploadedUrl = uploadImage()
        val created = createPost(
            """{"text":"모두 보는 기도","category":"PRAYER","images":["$uploadedUrl"]}""",
        )
        org.assertj.core.api.Assertions.assertThat(created["images"][0].asText()).isEqualTo(uploadedUrl)
    }

    @Test
    fun `인증 서빙은 UUID 이미지 파일명 외에는 404`() {
        mvc.get("/api/media/members/evil.txt") {
            headers { add("Authorization", "Bearer $token") }
        }.andExpect { status { isNotFound() } }
    }
}
