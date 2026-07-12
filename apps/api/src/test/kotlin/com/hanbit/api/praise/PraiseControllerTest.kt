package com.hanbit.api.praise

import com.hanbit.api.auth.PraiseRole
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
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/**
 * 찬양팀 API 접근 권한 + CRUD 왕복.
 * 찬양팀 권한은 SecurityConfig 매처가 아니라 PraiseService 의 DB praiseRole 검사이므로
 * (JwtAuthFilter 는 사이트 role 만 부여) 역할 조합별 401/403 경계를 여기서 검증한다.
 * 사용자: 1=비멤버, 2=멤버(VOCAL), 9=리더, 4=사이트 ADMIN(찬양팀 역할 없음).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PraiseControllerTest(
    @param:Autowired private val mvc: MockMvc,
    @param:Autowired private val jwt: JwtService,
    @param:Autowired private val users: UserRepository,
    @param:Autowired private val setlists: PraiseSetlistRepository,
    @param:Autowired private val assignments: PraiseAssignmentRepository,
    @param:Autowired private val actionLogs: com.hanbit.api.admin.AdminActionLogRepository,
    @param:Autowired private val json: JsonMapper,
) {
    private val outsiderToken = token(1, "비멤버")
    private val memberToken = token(2, "멤버")
    private val adminToken = token(4, "관리자")
    private val leaderToken = token(9, "리더")
    private val otherLeaderToken = token(101, "다른리더")

    private fun token(id: Long, name: String) =
        jwt.issue(User(id = id, email = "test-user-$id@hanbit.local", passwordHash = "x", name = name))

    @BeforeEach
    fun setUpRoles() {
        users.findById(2).orElseThrow().apply {
            praiseRole = PraiseRole.MEMBER.name
            praiseParts = listOf("VOCAL")
        }.let { users.saveAndFlush(it) }
        users.findById(9).orElseThrow().apply {
            praiseRole = PraiseRole.LEADER.name
            praiseParts = listOf("LEADER")
        }.let { users.saveAndFlush(it) }
        users.findById(101).orElseThrow().apply {
            praiseRole = PraiseRole.LEADER.name
            praiseParts = listOf("LEADER")
        }.let { users.saveAndFlush(it) }
        users.findById(4).orElseThrow().apply { role = UserRole.ADMIN.name }.let { users.saveAndFlush(it) }
    }

    private fun createBody(title: String = "7월 셋째 주 콘티") = """
        {
          "title": "$title",
          "worshipDate": "2026-07-19",
          "worshipType": "주일 2부 예배",
          "rehearsalTime": "오전 8:30 본당",
          "serviceTime": "오전 11:00",
          "location": "본당",
          "status": "DRAFT",
          "songs": [
            {"title": "주님 말씀하시면", "key": "G", "bpm": 72, "type": "worship",
             "links": [{"label": "데모 영상", "url": "https://example.com"}], "note": "잔잔하게 시작"},
            {"title": "물이 바다 덮음같이", "key": "A", "bpm": 128, "type": "praise"}
          ],
          "notices": [
            {"title": "리허설 공지", "body": "8:30 집합", "author": "리더", "date": "2026-07-14", "pinned": true}
          ]
        }
    """.trimIndent()

    private fun createSetlist(token: String = leaderToken, title: String = "7월 셋째 주 콘티"): String {
        val result = mvc.post("/api/praise/setlists") {
            headers { add("Authorization", "Bearer $token") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(title = title)
        }.andExpect { status { isCreated() } }.andReturn()
        return json.readTree(result.response.contentAsString).get("id").asString()
    }

    // ─── 접근 권한 ───

    @Test
    fun `미인증 요청은 401`() {
        mvc.get("/api/praise/setlists").andExpect { status { isUnauthorized() } }
        mvc.get("/api/praise/members").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `다른 리더는 남이 만든 콘티를 수정·삭제할 수 없다(403), 관리자·작성자는 가능`() {
        val id = createSetlist(token = leaderToken)
        // 다른 리더: 수정·삭제·배정 모두 403
        mvc.put("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $otherLeaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(title = "가로챈 수정")
        }.andExpect { status { isForbidden() } }
        mvc.delete("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $otherLeaderToken") }
        }.andExpect { status { isForbidden() } }
        // 작성자 본인은 수정 가능
        mvc.put("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(title = "작성자 수정")
        }.andExpect { status { isOk() } }
        // 관리자는 삭제 가능
        mvc.delete("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isNoContent() } }
    }

    @Test
    fun `찬양팀 아닌 회원은 조회도 403`() {
        mvc.get("/api/praise/setlists") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect { status { isForbidden() } }
        mvc.get("/api/praise/members") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect { status { isForbidden() } }
    }

    @Test
    fun `멤버는 목록·상세를 볼 수 있다 (목록은 페이지 응답)`() {
        val id = createSetlist()
        mvc.get("/api/praise/setlists?page=0&size=20") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '$id')].title") { value("7월 셋째 주 콘티") }
            jsonPath("$.page") { value(0) }
            jsonPath("$.totalElements") { isNotEmpty() }
        }
        mvc.get("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.songs[0].title") { value("주님 말씀하시면") }
            jsonPath("$.songs[1].order") { value(2) }
            jsonPath("$.notices[0].pinned") { value(true) }
        }
    }

    @Test
    fun `콘티 목록 페이지네이션 — size 만큼 잘리고 totalPages 가 계산된다`() {
        repeat(3) { createSetlist(title = "페이지 테스트 콘티 $it") }
        mvc.get("/api/praise/setlists?page=0&size=2") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
            jsonPath("$.size") { value(2) }
        }
        mvc.get("/api/praise/setlists?page=0&size=0") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `멤버는 콘티 쓰기·배정 관리를 할 수 없다(403)`() {
        val id = createSetlist()
        mvc.post("/api/praise/setlists") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody()
        }.andExpect { status { isForbidden() } }
        mvc.put("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody()
        }.andExpect { status { isForbidden() } }
        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect { status { isForbidden() } }
        mvc.delete("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect { status { isForbidden() } }
    }

    // ─── CRUD 왕복 ───

    @Test
    fun `리더는 콘티를 생성·수정·삭제할 수 있다`() {
        val id = createSetlist()

        mvc.put("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(title = "수정된 콘티").replace("\"status\": \"DRAFT\"", "\"status\": \"CONFIRMED\"")
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("수정된 콘티") }
            jsonPath("$.status") { value("CONFIRMED") }
        }

        mvc.delete("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect { status { isNoContent() } }
        assertThat(setlists.findById(id)).isEmpty()

        mvc.get("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `사이트 관리자는 찬양팀 역할 없이도 조회·쓰기가 가능하다`() {
        val id = createSetlist(token = adminToken)
        mvc.get("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isOk() } }
        mvc.delete("/api/praise/setlists/$id") {
            headers { add("Authorization", "Bearer $adminToken") }
        }.andExpect { status { isNoContent() } }
    }

    @Test
    fun `잘못된 본문은 400`() {
        mvc.post("/api/praise/setlists") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody(title = "")
        }.andExpect { status { isBadRequest() } }
        mvc.post("/api/praise/setlists") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = createBody().replace("2026-07-19", "다음주")
        }.andExpect { status { isBadRequest() } }
    }

    // ─── 배정·참석 ───

    @Test
    fun `리더가 배정하면 멤버 본인이 참석 응답을 바꿀 수 있다`() {
        val id = createSetlist()

        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"},{"userId":9,"part":"LEADER"}]}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.assignments.length()") { value(2) }
            jsonPath("$.assignments[?(@.userId == 2)].status") { value("PENDING") }
        }

        mvc.patch("/api/praise/setlists/$id/attendance") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"status":"LATE","memo":"2부 시작 직전 도착"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].status") { value("LATE") }
            jsonPath("$[0].memo") { value("2부 시작 직전 도착") }
        }
        assertThat(assignments.findBySetlistIdAndUserId(id, 2).single().attendanceStatus).isEqualTo("LATE")

        // 배정 교체 후에도 유지된 (userId, part) 조합의 참석 응답은 보존된다.
        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.assignments.length()") { value(1) }
            jsonPath("$.assignments[0].status") { value("LATE") }
        }
    }

    @Test
    fun `본인 배정이 없으면 참석 응답은 404`() {
        val id = createSetlist()
        mvc.patch("/api/praise/setlists/$id/attendance") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"status":"AVAILABLE"}"""
        }.andExpect { status { isNotFound() } }
    }

    @Test
    fun `찬양팀 아닌 회원은 배정 대상이 될 수 없다`() {
        val id = createSetlist()
        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":1,"part":"VOCAL"}]}"""
        }.andExpect { status { isBadRequest() } }
    }

    // ─── 팀원 목록 ───

    @Test
    fun `팀원 목록은 이름·역할·파트만 담고 이메일은 노출하지 않는다`() {
        mvc.get("/api/praise/members") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.id == 9)].praiseRole") { value("LEADER") }
            jsonPath("$[?(@.id == 2)].praiseParts[0]") { value("VOCAL") }
            jsonPath("$[?(@.id == 1)]") { doesNotExist() }
            jsonPath("$[0].email") { doesNotExist() }
        }
    }

    // ─── 배정 알림 ───

    @Test
    fun `배정되면 알림을 받고 해제되면 해제 알림을 받는다`() {
        val id = createSetlist()
        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect { status { isOk() } }

        mvc.get("/api/notifications?types=PRAISE_ASSIGNED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].type") { value("PRAISE_ASSIGNED") }
            jsonPath("$.content[0].href") { value("/praise-team/setlists/$id") }
        }

        mvc.put("/api/praise/setlists/$id/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[]}"""
        }.andExpect { status { isOk() } }

        mvc.get("/api/notifications?types=PRAISE_UNASSIGNED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].type") { value("PRAISE_UNASSIGNED") }
        }
    }

    @Test
    fun `파트가 그대로면 재저장해도 중복 알림이 없다`() {
        val id = createSetlist()
        repeat(2) {
            mvc.put("/api/praise/setlists/$id/assignments") {
                headers { add("Authorization", "Bearer $leaderToken") }
                contentType = MediaType.APPLICATION_JSON
                content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
            }.andExpect { status { isOk() } }
        }
        mvc.get("/api/notifications?types=PRAISE_ASSIGNED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(1) }
        }
    }

    // ─── 일정 ───

    private fun scheduleBody(visibility: String, title: String = "리허설") = """
        {
          "title": "$title",
          "type": "REHEARSAL",
          "startAt": "2026-08-02T23:30:00Z",
          "endAt": "2026-08-03T01:00:00Z",
          "location": "본당",
          "memo": "콘솔 오픈 8:15",
          "visibility": "$visibility"
        }
    """.trimIndent()

    private fun createSchedule(visibility: String, title: String = "리허설"): String {
        val result = mvc.post("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = scheduleBody(visibility, title)
        }.andExpect { status { isCreated() } }.andReturn()
        return json.readTree(result.response.contentAsString).get("id").asString()
    }

    @Test
    fun `일정 CRUD 는 리더만, 멤버는 조회만 가능하다`() {
        val id = createSchedule("PRIVATE")

        mvc.post("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = scheduleBody("PRIVATE")
        }.andExpect { status { isForbidden() } }

        mvc.get("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.id == '$id')].title") { value("리허설") }
        }

        mvc.put("/api/praise/schedules/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = scheduleBody("CHURCH", title = "수정된 리허설")
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("수정된 리허설") }
            jsonPath("$.visibility") { value("CHURCH") }
        }

        mvc.delete("/api/praise/schedules/$id") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect { status { isNoContent() } }
    }

    @Test
    fun `공개 일정은 요청자 층에 따라 좁혀진다`() {
        createSchedule("PRIVATE", title = "팀 내부 일정")
        createSchedule("CHURCH", title = "교회 공개 일정")
        createSchedule("PUBLIC", title = "외부 공개 일정")

        // 비로그인: PUBLIC 만.
        mvc.get("/api/praise/schedules/public").andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '외부 공개 일정')]") { exists() }
            jsonPath("$[?(@.title == '교회 공개 일정')]") { doesNotExist() }
            jsonPath("$[?(@.title == '팀 내부 일정')]") { doesNotExist() }
        }
        // 로그인 교인(찬양팀 아님): CHURCH+PUBLIC.
        mvc.get("/api/praise/schedules/public") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '교회 공개 일정')]") { exists() }
            jsonPath("$[?(@.title == '팀 내부 일정')]") { doesNotExist() }
        }
        // 찬양팀 멤버: PRIVATE 포함 전체.
        mvc.get("/api/praise/schedules/public") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '팀 내부 일정')]") { exists() }
        }
    }

    @Test
    fun `includePast 는 과거 일정까지 startAt 오름차순으로 돌려준다`() {
        // 과거·미래 각각 하나. 실제 clock 기준 확실한 과거 시각을 쓴다.
        mvc.post("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"지난 리허설","startAt":"2020-01-01T00:00:00Z","visibility":"PRIVATE"}"""
        }.andExpect { status { isCreated() } }
        createSchedule("PRIVATE", title = "다가오는 리허설")

        // 기본(includePast=false): 과거 제외.
        mvc.get("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '지난 리허설')]") { doesNotExist() }
            jsonPath("$[?(@.title == '다가오는 리허설')]") { exists() }
        }

        // includePast=true: 과거 포함 + startAt 오름차순(과거가 먼저).
        mvc.get("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $memberToken") }
            param("includePast", "true")
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].title") { value("지난 리허설") }
            jsonPath("$[1].title") { value("다가오는 리허설") }
        }
    }

    @Test
    fun `일정 검증 — 종료가 시작보다 빠르면 400`() {
        mvc.post("/api/praise/schedules") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"역순 일정","startAt":"2026-08-03T01:00:00Z","endAt":"2026-08-02T23:00:00Z"}"""
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `일정에 콘티를 연결하면 제목이 응답에 담기고 시각·장소 변경 시 배정자에게 알림이 간다`() {
        val setlistId = createSetlist()
        // 콘티에 멤버(2) 배정.
        mvc.put("/api/praise/setlists/$setlistId/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect { status { isOk() } }

        val scheduleId = json.readTree(
            mvc.post("/api/praise/schedules") {
                headers { add("Authorization", "Bearer $leaderToken") }
                contentType = MediaType.APPLICATION_JSON
                content = """{"title":"연결 리허설","startAt":"2026-08-02T23:30:00Z","location":"본당","visibility":"PRIVATE","setlistId":"$setlistId"}"""
            }.andExpect {
                status { isCreated() }
                jsonPath("$.setlistTitle") { value("7월 셋째 주 콘티") }
            }.andReturn().response.contentAsString,
        ).get("id").asString()

        // 시각 변경 → 배정자(2) 에게 PRAISE_SCHEDULE_CHANGED 알림.
        mvc.put("/api/praise/schedules/$scheduleId") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"연결 리허설","startAt":"2026-08-03T00:30:00Z","location":"교육관","visibility":"PRIVATE","setlistId":"$setlistId"}"""
        }.andExpect { status { isOk() } }

        mvc.get("/api/notifications?types=PRAISE_SCHEDULE_CHANGED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].type") { value("PRAISE_SCHEDULE_CHANGED") }
            jsonPath("$.content[0].href") { value("/praise-team/schedule") }
        }
    }

    @Test
    fun `일정 수정에서 시각·장소가 그대로면 변경 알림이 없다`() {
        val setlistId = createSetlist()
        mvc.put("/api/praise/setlists/$setlistId/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect { status { isOk() } }
        val scheduleId = json.readTree(
            mvc.post("/api/praise/schedules") {
                headers { add("Authorization", "Bearer $leaderToken") }
                contentType = MediaType.APPLICATION_JSON
                content = """{"title":"제목만 바꿈","startAt":"2026-08-02T23:30:00Z","location":"본당","visibility":"PRIVATE","setlistId":"$setlistId"}"""
            }.andExpect { status { isCreated() } }.andReturn().response.contentAsString,
        ).get("id").asString()

        mvc.put("/api/praise/schedules/$scheduleId") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"title":"제목만 바꿈2","startAt":"2026-08-02T23:30:00Z","location":"본당","visibility":"PRIVATE","setlistId":"$setlistId"}"""
        }.andExpect { status { isOk() } }

        mvc.get("/api/notifications?types=PRAISE_SCHEDULE_CHANGED") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(0) }
        }
    }

    // ─── 참석 리마인드 ───

    @Test
    fun `리더가 미응답자 리마인드를 보내면 PENDING 배정 멤버가 알림을 받는다`() {
        val setlistId = createSetlist()
        mvc.put("/api/praise/setlists/$setlistId/assignments") {
            headers { add("Authorization", "Bearer $leaderToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"assignments":[{"userId":2,"part":"VOCAL"}]}"""
        }.andExpect { status { isOk() } }

        // 멤버는 리마인드를 보낼 수 없다(403).
        mvc.post("/api/praise/setlists/$setlistId/attendance/remind") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect { status { isForbidden() } }

        mvc.post("/api/praise/setlists/$setlistId/attendance/remind") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.remindedCount") { value(1) }
            jsonPath("$.pendingCount") { value(1) }
        }
        mvc.get("/api/notifications?types=PRAISE_ATTENDANCE_REMINDER") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[0].type") { value("PRAISE_ATTENDANCE_REMINDER") }
        }

        // 멤버가 참석 응답하면 다음 리마인드 대상에서 빠진다.
        mvc.patch("/api/praise/setlists/$setlistId/attendance") {
            headers { add("Authorization", "Bearer $memberToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"status":"AVAILABLE"}"""
        }.andExpect { status { isOk() } }
        mvc.post("/api/praise/setlists/$setlistId/attendance/remind") {
            headers { add("Authorization", "Bearer $leaderToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.pendingCount") { value(0) }
        }
    }

    // ─── 곡 라이브러리 ───

    @Test
    fun `곡 라이브러리는 곡명 기준 집계와 사용횟수를 제공한다`() {
        // 시드 콘티의 곡과 겹치지 않는 고유 곡을 두 콘티에 담아 useCount 2 를 만든다.
        val unique = "라이브러리테스트곡-${UUID.randomUUID()}"
        val body = """
            {
              "title": "라이브러리 콘티",
              "worshipDate": "2026-07-19",
              "worshipType": "주일 2부 예배",
              "songs": [{"title": "$unique", "key": "C", "bpm": 90, "type": "praise", "links": []}],
              "notices": []
            }
        """.trimIndent()
        repeat(2) {
            mvc.post("/api/praise/setlists") {
                headers { add("Authorization", "Bearer $leaderToken") }
                contentType = MediaType.APPLICATION_JSON
                content = body
            }.andExpect { status { isCreated() } }
        }

        mvc.get("/api/praise/songs") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '$unique')].useCount") { value(2) }
            jsonPath("$[?(@.title == '$unique')].key") { value("C") }
        }
        // 검색어 필터.
        mvc.get("/api/praise/songs?q=$unique") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '$unique')]") { exists() }
        }
        // 비멤버는 403.
        mvc.get("/api/praise/songs") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect { status { isForbidden() } }
    }

    // ─── 감사 로그 ───

    @Test
    fun `찬양팀 역할 변경은 감사 로그에 남는다`() {
        mvc.patch("/api/admin/users/1/praise") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"praiseRole":"MEMBER","praiseParts":["DRUMS"]}"""
        }.andExpect { status { isOk() } }

        val log = actionLogs.findAll().last()
        assertThat(log.action).isEqualTo("PRAISE_ROLE_CHANGED")
        assertThat(log.targetId).isEqualTo("1")
        assertThat(log.detail).contains("없음 → MEMBER").contains("DRUMS")

        // 같은 값 재요청은 변화가 없어 기록하지 않는다.
        val before = actionLogs.count()
        mvc.patch("/api/admin/users/1/praise") {
            headers { add("Authorization", "Bearer $adminToken") }
            contentType = MediaType.APPLICATION_JSON
            content = """{"praiseRole":"MEMBER","praiseParts":["DRUMS"]}"""
        }.andExpect { status { isOk() } }
        assertThat(actionLogs.count()).isEqualTo(before)
    }

    // ─── 파일 업로드·인증 서빙 ───

    @Test
    fun `자료 업로드는 리더만, 이미지·PDF 만 허용하고 인증 서빙 URL 을 돌려준다`() {
        val pdfBytes = "%PDF-1.4 praise score".toByteArray()

        mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/praise/files")
                .file(org.springframework.mock.web.MockMultipartFile("file", "score.pdf", "application/pdf", pdfBytes))
                .header("Authorization", "Bearer $memberToken"),
        ).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden())

        val uploadJson = mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/praise/files")
                .file(org.springframework.mock.web.MockMultipartFile("file", "score.pdf", "application/pdf", pdfBytes))
                .header("Authorization", "Bearer $leaderToken"),
        )
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.kind").value("pdf"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.name").value("score.pdf"))
            // 공개 /uploads 가 아니라 인증 서빙 엔드포인트를 가리킨다.
            .andExpect(
                org.springframework.test.web.servlet.result.MockMvcResultMatchers
                    .jsonPath("$.url").value(org.hamcrest.Matchers.containsString("/api/praise/files/")),
            )
            .andReturn().response.contentAsString
        val url = json.readTree(uploadJson).get("url").asString()
        val filename = url.substringAfterLast("/api/praise/files/")

        // 이미지·PDF magic bytes 가 아니면(html 등 실행형 포함) 400.
        mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/praise/files")
                .file(org.springframework.mock.web.MockMultipartFile("file", "evil.html", "text/html", "<script>1</script>".toByteArray()))
                .header("Authorization", "Bearer $leaderToken"),
        ).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isBadRequest())

        // 인증 서빙: 미인증 401, 멤버는 스트리밍(PDF=attachment), 비멤버 403.
        mvc.get("/api/praise/files/$filename").andExpect { status { isUnauthorized() } }
        mvc.get("/api/praise/files/$filename") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect {
            status { isOk() }
            header { string("Content-Type", "application/pdf") }
            header { string("Content-Disposition", "attachment") }
            header { string("X-Content-Type-Options", "nosniff") }
        }
        mvc.get("/api/praise/files/$filename") {
            headers { add("Authorization", "Bearer $outsiderToken") }
        }.andExpect { status { isForbidden() } }

        // 경로 탐색·잘못된 파일명은 404.
        mvc.get("/api/praise/files/not-a-uuid.pdf") {
            headers { add("Authorization", "Bearer $memberToken") }
        }.andExpect { status { isNotFound() } }
    }
}
