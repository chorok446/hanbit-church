package com.cheolma.api.newfamily

import com.cheolma.api.auth.User
import com.cheolma.api.auth.UserRepository
import com.cheolma.api.auth.UserRole
import com.cheolma.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NewFamilyControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val repo: NewFamilyRepository,
) {
    private val adminToken = jwt.issue(
        User(id = 4, email = "test-user-4@cheolma.local", passwordHash = "x", name = "관리자"),
    )
    private val userToken = jwt.issue(
        User(id = 1, email = "test-user-1@cheolma.local", passwordHash = "x", name = "일반 사용자"),
    )

    @BeforeEach
    fun promoteAdmin() {
        val admin = users.findById(4).orElseThrow()
        admin.role = UserRole.ADMIN.name
        users.saveAndFlush(admin)
    }

    private fun register(body: String) =
        mvc.post("/api/new-family") {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    @Test
    fun `비로그인 방문자도 등록 신청할 수 있다`() {
        register("""{"name":"김새가족","phone":"010-1234-5678","note":"주일 2부에 가볼게요"}""").andExpect {
            status { isCreated() }
            jsonPath("$.received") { value(true) }
        }
    }

    @Test
    fun `이름·연락처가 없거나 형식이 틀리면 400`() {
        register("""{"name":"","phone":"010-1234-5678"}""").andExpect { status { isBadRequest() } }
        register("""{"name":"김새가족","phone":""}""").andExpect { status { isBadRequest() } }
        register("""{"name":"김새가족","phone":"전화주세요"}""").andExpect { status { isBadRequest() } }
    }

    @Test
    fun `목록은 관리자만 볼 수 있다`() {
        mvc.get("/api/admin/new-family").andExpect { status { isUnauthorized() } }
        mvc.get("/api/admin/new-family") {
            headers { add("Authorization", "Bearer $userToken") }
        }.andExpect { status { isForbidden() } }

        register("""{"name":"김새가족","phone":"010-1234-5678"}""").andExpect { status { isCreated() } }
        mvc.get("/api/admin/new-family") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].name") { value("김새가족") }
            jsonPath("$.pendingCount") { value(1) }
        }
    }

    @Test
    fun `연락 완료 표시와 미연락 필터가 동작한다`() {
        val id = "nf-${UUID.randomUUID()}"
        repo.saveAndFlush(
            NewFamilyRegistration(id, "박새가족", "010-9876-5432", null, Instant.now()),
        )

        mvc.patch("/api/admin/new-family/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"contacted":true}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.contactedAt") { isNotEmpty() }
        }
        assertThat(repo.findById(id).get().contactedAt).isNotNull()

        mvc.get("/api/admin/new-family?pendingOnly=true") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '$id')]") { doesNotExist() }
        }
    }
}
