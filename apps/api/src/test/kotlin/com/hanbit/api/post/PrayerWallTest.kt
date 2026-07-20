package com.hanbit.api.post

import com.hanbit.api.auth.User
import com.hanbit.api.auth.UserRepository
import com.hanbit.api.auth.UserRole
import com.hanbit.api.security.JwtService
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PrayerWallTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val jwt: JwtService,
    @param:Autowired val posts: PostRepository,
    @param:Autowired val users: UserRepository,
) {
    // author = 1, 남 = 2, 스태프 승격은 4.
    private val authorToken = jwt.issue(User(id = 1, email = "a@t.com", passwordHash = "x", name = "작성자"))
    private val otherToken = jwt.issue(User(id = 2, email = "b@t.com", passwordHash = "x", name = "다른이"))
    private val staffToken = jwt.issue(User(id = 4, email = "test-user-4@hanbit.local", passwordHash = "x", name = "스태프"))

    private fun savePrayer(category: String = PostCategory.PRAYER): String {
        val id = "pw-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(id, Author("작성자", false), "방금", "기도 부탁드립니다", emptyList(), emptyList(), 0, 0,
                seq = System.nanoTime(), authorUserId = 1, category = category),
        )
        return id
    }

    private fun promoteStaff() {
        val staff = users.findById(4).orElseThrow()
        staff.role = UserRole.OPERATOR.name
        users.saveAndFlush(staff)
    }

    @Test
    fun `함께 기도했어요는 카운터를 올리고 prayedByMe true, 재요청은 idempotent`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.prayedCount") { value(1) }
            jsonPath("$.prayedByMe") { value(true) }
        }
        // 같은 사용자 재요청은 증가 없음.
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.prayedCount") { value(1) }
        }
    }

    @Test
    fun `함께 기도했어요 취소는 카운터를 내리고 prayedByMe false`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }
        mvc.delete("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.prayedCount") { value(0) }
            jsonPath("$.prayedByMe") { value(false) }
        }
        // 누르지 않은 상태 재취소도 idempotent(0 미만으로 내려가지 않음).
        mvc.delete("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.prayedCount") { value(0) }
        }
    }

    @Test
    fun `집계는 익명 — 여러 사용자가 눌러도 카운트만 오르고 본인 여부는 사용자별로 다르다`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $staffToken") } }.andExpect {
            jsonPath("$.prayedCount") { value(2) }
            jsonPath("$.prayedByMe") { value(true) }
        }
        // 누르지 않은 작성자에게는 카운트 2, prayedByMe=false.
        mvc.get("/api/posts/$id") { headers { add("Authorization", "Bearer $authorToken") } }.andExpect {
            jsonPath("$.prayedCount") { value(2) }
            jsonPath("$.prayedByMe") { value(false) }
        }
    }

    @Test
    fun `기도 반응은 기도 카테고리 전용 — 나눔 글은 400`() {
        val id = savePrayer(category = PostCategory.SHARING)
        mvc.post("/api/posts/$id/pray") { headers { add("Authorization", "Bearer $otherToken") } }
            .andExpect { status { isBadRequest() } }
    }

    @Test
    fun `기도 반응은 로그인이 필요하다(401)`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/pray").andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `응답받았어요는 작성자가 마킹·해제할 수 있다`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/answered") { headers { add("Authorization", "Bearer $authorToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.answered") { value(true) }
        }
        mvc.delete("/api/posts/$id/answered") { headers { add("Authorization", "Bearer $authorToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.answered") { value(false) }
        }
    }

    @Test
    fun `응답받았어요는 스태프도 마킹할 수 있다`() {
        promoteStaff()
        val id = savePrayer()
        mvc.post("/api/posts/$id/answered") { headers { add("Authorization", "Bearer $staffToken") } }.andExpect {
            status { isOk() }
            jsonPath("$.answered") { value(true) }
        }
    }

    @Test
    fun `응답받았어요는 작성자·스태프가 아니면 403`() {
        val id = savePrayer()
        mvc.post("/api/posts/$id/answered") { headers { add("Authorization", "Bearer $otherToken") } }
            .andExpect { status { isForbidden() } }
    }

    @Test
    fun `응답받았어요도 기도 카테고리 전용 — 나눔 글은 400`() {
        val id = savePrayer(category = PostCategory.SHARING)
        mvc.post("/api/posts/$id/answered") { headers { add("Authorization", "Bearer $authorToken") } }
            .andExpect { status { isBadRequest() } }
    }

    @Test
    fun `검색은 PRAYER 카테고리로 기도벽 글만 필터링한다`() {
        val prayerId = savePrayer()
        val sharingId = savePrayer(category = PostCategory.SHARING)
        mvc.get("/api/posts/search?category=PRAYER&size=50") {
            headers { add("Authorization", "Bearer $authorToken") }
        }.andExpect {
            status { isOk() }
            jsonPath("$.content[?(@.id == '$prayerId')]") { exists() }
            jsonPath("$.content[?(@.id == '$sharingId')]") { doesNotExist() }
        }
    }
}
