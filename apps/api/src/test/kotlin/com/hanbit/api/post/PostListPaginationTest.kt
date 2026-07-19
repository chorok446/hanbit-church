package com.hanbit.api.post

import org.hamcrest.Matchers
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * GET /api/posts 공개 목록의 page/size 페이지네이션 계약 회귀 가드(배열 → content 객체 전환).
 * 시드 게시글이 섞여 있으므로 절대 카운트 대신 구조·경계·size 반영을 검증한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PostListPaginationTest(
    @param:Autowired val mvc: MockMvc,
    @param:Autowired val posts: PostRepository,
) {
    private fun savePost(seq: Long): String {
        val id = "lp-${UUID.randomUUID()}"
        posts.saveAndFlush(
            Post(id, Author("작성자", false), "방금", "본문", emptyList(), emptyList(), 0, 0, seq = seq),
        )
        return id
    }

    @Test
    fun `기본 응답은 content 객체와 metadata를 담는다`() {
        savePost(seq = 1)
        mvc.get("/api/posts").andExpect {
            status { isOk() }
            jsonPath("$.content") { isArray() }
            jsonPath("$.page") { value(0) }
            jsonPath("$.size") { value(50) } // 기본 size = 하드캡
            jsonPath("$.totalElements") { value(Matchers.greaterThanOrEqualTo(1)) }
            jsonPath("$.totalPages") { value(Matchers.greaterThanOrEqualTo(1)) }
        }
    }

    @Test
    fun `page와 size를 검증한다`() {
        mvc.get("/api/posts") { param("page", "-1") }.andExpect { status { isBadRequest() } }
        mvc.get("/api/posts") { param("size", "0") }.andExpect { status { isBadRequest() } }
        mvc.get("/api/posts") { param("size", "51") }.andExpect { status { isBadRequest() } }
    }

    @Test
    fun `size가 content 슬라이스를 제한한다`() {
        repeat(3) { savePost(seq = it.toLong()) }
        mvc.get("/api/posts") { param("page", "0"); param("size", "2") }.andExpect {
            status { isOk() }
            jsonPath("$.size") { value(2) }
            jsonPath("$.content.length()") { value(2) } // 시드 포함 3건 이상이라 첫 페이지는 정확히 size 만큼
            jsonPath("$.totalElements") { value(Matchers.greaterThanOrEqualTo(3)) }
        }
    }

    @Test
    fun `범위 밖 page는 빈 content와 echo된 metadata`() {
        savePost(seq = 1)
        mvc.get("/api/posts") { param("page", "100000"); param("size", "50") }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(0) }
            jsonPath("$.page") { value(100000) }
            jsonPath("$.size") { value(50) }
            jsonPath("$.totalElements") { value(Matchers.greaterThanOrEqualTo(1)) }
        }
    }
}
