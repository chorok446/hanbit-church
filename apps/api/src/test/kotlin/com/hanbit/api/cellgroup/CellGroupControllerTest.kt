package com.hanbit.api.cellgroup

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.security.JwtService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper

/**
 * 목장(소그룹) API 접근 권한 + CRUD 왕복.
 * 권한은 SecurityConfig 매처가 아니라 CellGroupService 의 DB role·roster 검사이므로
 * (JwtAuthFilter 는 사이트 role 만 부여) 매니저/리더/멤버/외부인 경계를 여기서 검증한다.
 * 사용자: 4=ADMIN(매니저), 201=MINISTRY(매니저), 9=그룹 리더(USER), 2=멤버, 1=외부인.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CellGroupControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val groups: CellGroupRepository,
    @param:Autowired private val members: CellGroupMemberRepository,
    @param:Autowired private val meetings: CellGroupMeetingRepository,
    @param:Autowired private val json: JsonMapper,
) {
    private val outsiderToken = token(1, "외부인")
    private val memberToken = token(2, "멤버")
    private val adminToken = token(4, "관리자")
    private val leaderToken = token(9, "리더")
    private val ministryToken = token(201, "사역자")

    private fun token(id: Long, name: String) =
        jwt.issue(User(id = id, email = "test-user-$id@hanbit.local", passwordHash = "x", name = name))

    @BeforeEach
    fun setUpRoles() {
        users.findById(4).orElseThrow().apply { role = UserRole.ADMIN.name }.let { users.saveAndFlush(it) }
        users.findById(201).orElseThrow().apply { role = UserRole.MINISTRY.name }.let { users.saveAndFlush(it) }
    }

    private fun createBody(name: String = "주은 목장", leaderUserId: Long? = 9, active: Boolean = true) = """
        {
          "name": "$name",
          "district": "1구역",
          "description": "금요일 저녁 가정 모임",
          "leaderUserId": ${leaderUserId ?: "null"},
          "active": $active
        }
    """.trimIndent()

    private fun createGroup(token: String = adminToken, name: String = "주은 목장", leaderUserId: Long? = 9): String {
        val result = mvc.post("/api/cell-groups") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = name, leaderUserId = leaderUserId)
        }.andExpect { status { isCreated() } }.andReturn()
        return json.readTree(result.response.contentAsString).get("id").asString()
    }

    // ─── 접근 권한 ───

    @Test
    fun `미인증 요청은 401`() {
        mvc.get("/api/cell-groups").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `그룹 생성은 매니저(ADMIN·MINISTRY)만, 일반 회원은 403`() {
        createGroup(token = adminToken, name = "관리자 목장")
        createGroup(token = ministryToken, name = "사역자 목장")
        mvc.post("/api/cell-groups") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = "일반회원 목장")
        }.andExpect { status { isForbidden() } }
        // 리더 권한만으로는 새 그룹을 못 만든다(매니저 전용).
        mvc.post("/api/cell-groups") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = "리더가 만든 목장")
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `디렉터리는 활성 목장만 보이고 비활성은 매니저만 본다`() {
        createGroup(name = "활성 목장")
        val hiddenId = createGroup(name = "비활성 목장")
        mvc.put("/api/cell-groups/$hiddenId") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = "비활성 목장", active = false)
        }.andExpect { status { isOk() } }

        // 일반 회원: 비활성 제외.
        mvc.get("/api/cell-groups") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.name == '활성 목장')]") { exists() }
            jsonPath("$[?(@.name == '비활성 목장')]") { doesNotExist() }
            jsonPath("$[?(@.name == '활성 목장')].leaderName") { value("테스트 사용자 9") }
        }
        // 매니저: 비활성 포함.
        mvc.get("/api/cell-groups") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.name == '비활성 목장')]") { exists() }
        }
    }

    @Test
    fun `상세는 멤버·리더·매니저만, 외부인은 403`() {
        val id = createGroup()
        // 로스터에 멤버(2) 추가.
        setRoster(id, listOf(2L to "MEMBER"))

        mvc.get("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.members[?(@.userId == 2)].name") { value("테스트 사용자 2") }
            jsonPath("$.canManage") { value(false) }
        }
        // 리더는 관리 가능 표시.
        mvc.get("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.canManage") { value(true) }
            jsonPath("$.canManageRoster") { value(false) }
        }
        // 외부인 403.
        mvc.get("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect { status { isForbidden() } }
    }

    private fun setRoster(groupId: String, roster: List<Pair<Long, String>>, token: String = adminToken) {
        val body = roster.joinToString(",", "[", "]") { (uid, role) -> """{"userId":$uid,"role":"$role"}""" }
        mvc.put("/api/cell-groups/$groupId/members") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"members":$body}"""
        }.andExpect { status { isOk() } }
    }

    // ─── 로스터 ───

    @Test
    fun `로스터 교체는 매니저만, 리더는 403`() {
        val id = createGroup()
        mvc.put("/api/cell-groups/$id/members") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"members":[{"userId":2,"role":"MEMBER"}]}"""
        }.andExpect { status { isForbidden() } }
        setRoster(id, listOf(2L to "MEMBER")) // 매니저는 성공
        assertThat(members.findByCellGroupId(id).map { it.userId }).containsExactly(2L)
    }

    @Test
    fun `로스터에 새로 추가된 멤버는 합류 알림을 받고, 재저장 시 중복 알림이 없다`() {
        val id = createGroup()
        setRoster(id, listOf(2L to "MEMBER"))
        mvc.get("/api/notifications?types=CELL_GROUP_JOINED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].type") { value("CELL_GROUP_JOINED") }
            jsonPath("$.content[0].href") { value("/cell-groups/$id") }
        }
        // 같은 멤버가 남아있는 재저장은 새 합류 알림을 만들지 않는다.
        setRoster(id, listOf(2L to "LEADER"))
        mvc.get("/api/notifications?types=CELL_GROUP_JOINED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(1) }
        }
    }

    @Test
    fun `로스터에 없는 회원은 배정 400`() {
        val id = createGroup()
        mvc.put("/api/cell-groups/$id/members") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"members":[{"userId":999999,"role":"MEMBER"}]}"""
        }.andExpect { status { isBadRequest() } }
    }

    // ─── 정보 수정 권한 분리 ───

    @Test
    fun `리더는 이름·설명을 수정할 수 있지만 리더 재지정·활성 전환은 무시된다`() {
        val id = createGroup(leaderUserId = 9)
        mvc.put("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            // 리더가 자신을 빼고(leaderUserId=2) 비활성(active=false)을 시도해도 무시돼야 한다.
            content = createBody(name = "리더가 수정", leaderUserId = 2, active = false)
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("리더가 수정") }
            jsonPath("$.leaderUserId") { value(9) } // 유지
            jsonPath("$.active") { value(true) } // 유지
        }
    }

    @Test
    fun `매니저는 리더 재지정과 비활성 전환을 할 수 있다`() {
        val id = createGroup(leaderUserId = 9)
        mvc.put("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = "주은 목장", leaderUserId = 2, active = false)
        }.andExpect {
            status { isOk() }
            jsonPath("$.leaderUserId") { value(2) }
            jsonPath("$.active") { value(false) }
        }
    }

    @Test
    fun `잘못된 본문은 400`() {
        mvc.post("/api/cell-groups") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(name = "")
        }.andExpect { status { isBadRequest() } }
    }

    // ─── 모임 ───

    private fun meetingBody(title: String = "7월 첫째 주 모임", attendance: String = "[]") = """
        {
          "title": "$title",
          "meetAt": "2026-07-24T10:00:00Z",
          "location": "리더 가정",
          "agenda": "요한복음 15장 나눔",
          "sharingNote": "각자 한 주간 삶을 나눔",
          "attendance": $attendance
        }
    """.trimIndent()

    @Test
    fun `모임 CRUD 는 리더·매니저만, 멤버는 조회만`() {
        val id = createGroup()
        setRoster(id, listOf(2L to "MEMBER", 9L to "LEADER"))

        // 멤버는 모임 생성 불가(403).
        mvc.post("/api/cell-groups/$id/meetings") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = meetingBody()
        }.andExpect { status { isForbidden() } }

        // 리더는 생성 + 참석 기록.
        val meetingId = json.readTree(
            mvc.post("/api/cell-groups/$id/meetings") {
                headers { add("Authorization", "Bearer $leaderToken") }
                contentType = MediaType.APPLICATION_JSON
                content = meetingBody(attendance = """[{"userId":2,"status":"PRESENT"},{"userId":9,"status":"EXCUSED"}]""")
            }.andExpect {
                status { isCreated() }
                jsonPath("$.attendance.length()") { value(2) }
                jsonPath("$.attendance[?(@.userId == 2)].status") { value("PRESENT") }
                jsonPath("$.sharingNote") { value("각자 한 주간 삶을 나눔") }
            }.andReturn().response.contentAsString,
        ).get("id").asString()

        // 멤버는 상세에서 모임을 볼 수 있다.
        mvc.get("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.meetings[?(@.id == '$meetingId')].title") { value("7월 첫째 주 모임") }
        }

        // 리더는 삭제 가능.
        mvc.delete("/api/cell-groups/$id/meetings/$meetingId") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect { status { isNoContent() } }
        assertThat(meetings.findById(meetingId)).isEmpty()
    }

    @Test
    fun `참석 기록은 로스터 안에서만, 밖이면 400`() {
        val id = createGroup()
        setRoster(id, listOf(2L to "MEMBER"))
        mvc.post("/api/cell-groups/$id/meetings") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = meetingBody(attendance = """[{"userId":1,"status":"PRESENT"}]""")
        }.andExpect { status { isBadRequest() } }
    }

    // ─── 후보 검색 ───

    @Test
    fun `로스터 후보 검색은 매니저만`() {
        mvc.get("/api/cell-groups/candidates?q=테스트") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect { status { isForbidden() } }
        mvc.get("/api/cell-groups/candidates?q=테스트") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].name") { exists() }
            jsonPath("$[0].email") { doesNotExist() }
        }
    }

    // ─── 삭제 cascade ───

    @Test
    fun `삭제는 매니저만이고 로스터·모임을 함께 지운다`() {
        val id = createGroup()
        setRoster(id, listOf(2L to "MEMBER"))
        mvc.post("/api/cell-groups/$id/meetings") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = meetingBody()
        }.andExpect { status { isCreated() } }

        mvc.delete("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect { status { isForbidden() } }

        mvc.delete("/api/cell-groups/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isNoContent() } }
        assertThat(groups.findById(id)).isEmpty()
        assertThat(members.findByCellGroupId(id)).isEmpty()
        assertThat(meetings.findByCellGroupIdOrderByMeetAtDesc(id)).isEmpty()
    }

    @Test
    fun `내 목장 목록은 소속·리더 그룹만 담는다`() {
        val mineId = createGroup(name = "내 목장", leaderUserId = 9)
        setRoster(mineId, listOf(2L to "MEMBER"))
        createGroup(name = "남의 목장", leaderUserId = 4)

        mvc.get("/api/cell-groups/mine") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.name == '내 목장')]") { exists() }
            jsonPath("$[?(@.name == '남의 목장')]") { doesNotExist() }
        }
    }
}
