package com.dasida.api.post

import com.dasida.api.common.Photos
import com.fasterxml.jackson.annotation.JsonIgnore
import jakarta.persistence.Column
import jakarta.persistence.Embeddable
import jakarta.persistence.Embedded
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

@Embeddable
class Author(
    var name: String = "",
    var verified: Boolean = false,
    @Column(name = "profile_image_url", length = 500) var profileImageUrl: String? = null,
)

/** 게시글 카테고리. 소식(공지·주보)/설교 목록 필터의 기준이 된다. */
object PostCategory {
    const val NOTICE = "NOTICE" // 공지
    const val BULLETIN = "BULLETIN" // 주보
    const val SERMON = "SERMON" // 설교
    const val SHARING = "SHARING" // 나눔(기본)
    const val PRAYER = "PRAYER" // 기도요청

    val ALL = setOf(NOTICE, BULLETIN, SERMON, SHARING, PRAYER)
}

@Entity
@Table(
    name = "posts",
    indexes = [
        Index(name = "idx_posts_author_user_id", columnList = "author_user_id"),
        // 행사 삭제 시 연결 게시글 존재 확인(existsByCampaignId)을 위한 조회용 인덱스.
        Index(name = "idx_posts_campaign_id", columnList = "campaign_id"),
        // 소식·설교 목록의 카테고리 필터용.
        Index(name = "idx_posts_category", columnList = "category"),
    ],
)
class Post(
    @Id val id: String,
    @Embedded val author: Author,
    @Column(name = "time_label") val time: String,
    // text/tags/images/campaignId 는 수정 API(PUT)에서 갱신되므로 var. 정렬·소유권 필드(seq/time/authorUserId)는 불변.
    @Column(name = "content", columnDefinition = "TEXT") var text: String,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var tags: List<String>,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var images: List<String>,
    var likes: Int,
    var comments: Int,
    var campaignId: String? = null,
    @JsonIgnore var seq: Long = 0, // 정렬용. 시드=인덱스, 생성=epoch millis (최신이 위로)
    // 작성자 소유권 판단용. author.name 은 작성 당시 표시 이름 snapshot 이므로 소유권엔 쓰지 않는다.
    // 시드/기존 게시글은 null(소유자 없음). 이름 기반 backfill 하지 않는다.
    @Column(name = "author_user_id") @JsonIgnore val authorUserId: Long? = null,
    // 관리자 숨김(soft hide). null = 공개. 값이 있으면 공개 목록/검색/상세(작성자 제외)에서 제외된다.
    @Column(name = "hidden_at") @JsonIgnore var hiddenAt: java.time.Instant? = null,
    @Column(name = "hidden_reason", length = 500) @JsonIgnore var hiddenReason: String? = null,
    // 작성자 삭제(soft delete). 값이 있으면 작성자 본인·관리자 복구 경로에서도 404 로 취급한다.
    // 삭제 시 hiddenAt 도 함께 세팅해 공개 노출 제외를 재사용한다.
    @Column(name = "deleted_at") @JsonIgnore var deletedAt: java.time.Instant? = null,
    // 카테고리(PostCategory). 수정 API 에서 변경 가능. positional 생성 호출과의 호환을 위해 마지막 파라미터.
    @Column(nullable = false, length = 20) var category: String = PostCategory.SHARING,
)

/**
 * 초기 적재 시드. apps/web/src/data/posts.ts 와 1:1 미러. SeedRunner 가 비어있을 때만 저장.
 */
object PostSeed {
    private val workshop = Photos.workshop
    private val nature = Photos.nature
    private val market = Photos.market
    private val people = Photos.people
    private val obj = Photos.obj

    val posts: List<Post> = listOf(
        Post("p1", Author("한빛교회", true), "2시간 전",
            "이번 주일 오후, 여름 청년 수련회 사전 모임이 있습니다. 신청하신 분들은 본당 앞으로 모여주세요.",
            listOf("#공지", "#청년부"), listOf(people[3]), 42, 0, "c1",
            category = PostCategory.NOTICE),
        Post("p2", Author("한빛교회", true), "5시간 전",
            "7월 둘째 주 주보입니다. 예배 순서와 교회 소식을 확인해 주세요.",
            listOf("#주보"), listOf(market[4]), 18, 0,
            category = PostCategory.BULLETIN),
        Post("p3", Author("한빛교회", true), "어제",
            "주일 설교 — \"항상 기뻐하라\" (데살로니가전서 5:16-18). 다시듣기: https://www.youtube.com/watch?v=dQw4w9WgXcQ 지난 주일 말씀의 요약과 나눔 질문을 함께 올립니다.",
            listOf("#설교", "#주일예배"), emptyList(), 96, 0,
            category = PostCategory.SERMON),
        Post("p4", Author("사랑부", true), "2일 전",
            "토요일 반찬 나눔 봉사 후기. 열두 가정에 반찬을 전해드렸습니다. 함께해 주신 분들 감사합니다 🙏",
            listOf("#봉사", "#사랑부"), listOf(people[0]), 87, 0, "c2",
            category = PostCategory.SHARING),
        Post("p5", Author("김은혜", false), "3일 전",
            "어머니 수술이 다음 주로 잡혔습니다. 수술이 잘 되도록 함께 기도해 주세요.",
            listOf("#기도요청"), emptyList(), 54, 0,
            category = PostCategory.PRAYER),
        Post("p6", Author("교육부", true), "4일 전",
            "봄 학기 성경공부반이 마쳤습니다. 로마서를 함께 읽으며 나눈 은혜를 사진으로 남깁니다.",
            listOf("#성경공부", "#교육부"), listOf(workshop[2], workshop[5]), 33, 0, "c5",
            category = PostCategory.SHARING),
        Post("p7", Author("이믿음", false), "5일 전",
            "새가족 등록하고 첫 목장 모임에 다녀왔습니다. 따뜻하게 맞아주셔서 감사했어요.",
            listOf("#새가족", "#목장"), listOf(market[1]), 29, 0,
            category = PostCategory.SHARING),
        Post("p8", Author("한빛교회", true), "1주 전",
            "주일 설교 — \"선한 목자\" (시편 23편). 말씀 요약과 함께 한 주간 묵상 구절을 나눕니다.",
            listOf("#설교", "#주일예배"), emptyList(), 71, 0,
            category = PostCategory.SERMON),
        Post("p9", Author("주일학교", false), "1주 전",
            "여름성경학교 준비가 한창입니다. 교사로 함께해 주실 선생님들을 기다립니다!",
            listOf("#주일학교", "#여름성경학교"), listOf(nature[2]), 38, 0, "c7",
            category = PostCategory.SHARING),
        Post("p10", Author("박소망", false), "2주 전",
            "취업을 준비하고 있습니다. 지치지 않고 걸어갈 수 있도록 기도 부탁드립니다.",
            listOf("#기도요청", "#청년부"), listOf(obj[5]), 45, 0,
            category = PostCategory.PRAYER),
    )
}
