package com.hanbit.api.authorization

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.security.JwtService
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

/** 스태프 역할(OPERATOR/MINISTRY/NEW_FAMILY/CONTENT)별 관리자 API·공식 카테고리 접근 정책. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class StaffRolePermissionsTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val users: UserRepository,
) {
    // TestUserSeed 의 고정 사용자들에게 역할을 부여해 사용한다(@Transactional 롤백).
    private fun tokenWithRole(userId: Long, role: UserRole): String {
        val user = users.findById(userId).orElseThrow()
        user.role = role.name
        users.saveAndFlush(user)
        return jwt.issue(User(id = userId, email = user.email, passwordHash = "x", name = user.name))
    }

    private lateinit var operatorToken: String
    private lateinit var ministryToken: String
    private lateinit var newFamilyToken: String
    private lateinit var contentToken: String

    @BeforeEach
    fun setUp() {
        operatorToken = tokenWithRole(101, UserRole.OPERATOR)
        ministryToken = tokenWithRole(102, UserRole.MINISTRY)
        newFamilyToken = tokenWithRole(201, UserRole.NEW_FAMILY)
        contentToken = tokenWithRole(211, UserRole.CONTENT)
    }

    private fun get(path: String, token: String) =
        mvc.get(path) { headers { add("Authorization", "Bearer $token") } }

    @Test
    fun `운영자는 신고·가입 승인·회원 조회에 접근할 수 있다`() {
        get("/api/admin/reports", operatorToken).andExpect { status { isOk() } }
        get("/api/admin/users/pending", operatorToken).andExpect { status { isOk() } }
        get("/api/admin/users", operatorToken).andExpect { status { isOk() } }
    }

    @Test
    fun `운영자도 감사 로그·역할 변경에는 접근할 수 없다(최고 관리자 전용)`() {
        get("/api/admin/logs", operatorToken).andExpect { status { isForbidden() } }
        mvc.patch("/api/admin/users/1/role") {
            headers { add("Authorization", "Bearer $operatorToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"role":"ADMIN"}"""
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `새가족 담당자는 새가족 목록만 접근할 수 있다`() {
        get("/api/admin/new-family", newFamilyToken).andExpect { status { isOk() } }
        get("/api/admin/summary", newFamilyToken).andExpect { status { isOk() } }
        get("/api/admin/reports", newFamilyToken).andExpect { status { isForbidden() } }
    }

    @Test
    fun `사역 담당자는 대시보드 요약은 되고 신고·새가족은 안 된다`() {
        get("/api/admin/summary", ministryToken).andExpect { status { isOk() } }
        get("/api/admin/reports", ministryToken).andExpect { status { isForbidden() } }
        get("/api/admin/new-family", ministryToken).andExpect { status { isForbidden() } }
    }

    @Test
    fun `콘텐츠 관리자는 공지를 작성할 수 있고 사역 담당자는 못 한다`() {
        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $contentToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"콘텐츠 관리자 공지","category":"NOTICE"}"""
        }.andExpect { status { isCreated() } }

        mvc.post("/api/posts") {
            headers { add("Authorization", "Bearer $ministryToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"text":"사역 담당자 공지 시도","category":"NOTICE"}"""
        }.andExpect { status { isForbidden() } }
    }
}
