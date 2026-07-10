package com.hanbit.api.post

import com.hanbit.api.common.Photos
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
/** 게시글 공개 범위. MEMBERS 는 기도(PRAYER) 전용 — 로그인한(승인제 통과) 교인만 열람한다. */
object PostVisibility {
    const val PUBLIC = "PUBLIC"
    const val MEMBERS = "MEMBERS"

    val ALL = setOf(PUBLIC, MEMBERS)
}

/** countByAuthorUserIdsAndAnonymousFalse JPQL constructor projection 용. */
data class AuthorPostCount(val authorUserId: Long, val count: Long)

/** 예약 게시 대기 상태를 나타내는 hiddenReason 마커 — 운영 숨김과 구분해 게시 잡이 이 값만 공개 전환한다. */
const val SCHEDULED_HIDDEN_REASON = "예약 게시 대기"

object PostCategory {
    const val NOTICE = "NOTICE" // 공지
    const val BULLETIN = "BULLETIN" // 주보
    const val SERMON = "SERMON" // 설교
    const val SHARING = "SHARING" // 나눔(기본)
    const val PRAYER = "PRAYER" // 기도요청

    val ALL = setOf(NOTICE, BULLETIN, SERMON, SHARING, PRAYER)

    /** 교회 공식 소식 카테고리 — 좋아요·신고 비노출, 파일 첨부(주보 PDF 등) 허용. */
    val ADMIN_ONLY = setOf(NOTICE, BULLETIN)

    /** 스태프(최고 관리자·운영자·콘텐츠 관리자)만 작성·수정할 수 있는 카테고리. 설교는 좋아요·후기는 유지된다. */
    val STAFF_WRITE = setOf(NOTICE, BULLETIN, SERMON)
}

/** 게시글 첨부파일(주보 PDF 등). posts.attachments json 컬럼에 배열로 저장된다. */
data class PostAttachment(
    val name: String = "",
    val url: String = "",
    val size: Long? = null,
)

@Entity
@Table(
    name = "posts",
    indexes = [
        Index(name = "idx_posts_author_user_id", columnList = "author_user_id"),
        // 행사 삭제 시 연결 게시글 존재 확인(existsByEventId)을 위한 조회용 인덱스.
        Index(name = "idx_posts_event_id", columnList = "event_id"),
        // 소식·설교 목록의 카테고리 필터용.
        Index(name = "idx_posts_category", columnList = "category"),
        // 공개 목록/검색: 모든 공개 read 가 hidden_at IS NULL + seq 내림차순. 전체 피드용.
        Index(name = "idx_posts_hidden_seq", columnList = "hidden_at, seq"),
        // 카테고리 목록(소식·설교·나눔·기도) + 숨김 필터 + seq 정렬 복합.
        Index(name = "idx_posts_category_hidden_seq", columnList = "category, hidden_at, seq"),
    ],
)
class Post(
    @Id val id: String,
    @Embedded val author: Author,
    @Column(name = "time_label") val time: String,
    // text/tags/images/eventId 는 수정 API(PUT)에서 갱신되므로 var. 정렬·소유권 필드(seq/time/authorUserId)는 불변.
    @Column(name = "content", columnDefinition = "TEXT") var text: String,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var tags: List<String>,
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var images: List<String>,
    var likes: Int,
    var comments: Int,
    var eventId: String? = null,
    @JsonIgnore var seq: Long = 0, // 정렬용. 시드=인덱스, 생성=epoch millis (최신이 위로)
    // 작성자 소유권 판단용. author.name 은 작성 당시 표시 이름 snapshot 이므로 소유권엔 쓰지 않는다.
    // 시드/기존 게시글은 null(소유자 없음). 이름 기반 backfill 하지 않는다.
    @Column(name = "author_user_id") @JsonIgnore val authorUserId: Long? = null,
    // 작성 시각. 시드 게시글은 null(작성 시점 미상 — V33 backfill 은 epoch-millis seq 만 복원).
    @Column(name = "created_at") val createdAt: java.time.Instant? = null,
    // 관리자 숨김(soft hide). null = 공개. 값이 있으면 공개 목록/검색/상세(작성자 제외)에서 제외된다.
    @Column(name = "hidden_at") @JsonIgnore var hiddenAt: java.time.Instant? = null,
    @Column(name = "hidden_reason", length = 500) @JsonIgnore var hiddenReason: String? = null,
    // 작성자 삭제(soft delete). 값이 있으면 작성자 본인·관리자 복구 경로에서도 404 로 취급한다.
    // 삭제 시 hiddenAt 도 함께 세팅해 공개 노출 제외를 재사용한다.
    @Column(name = "deleted_at") @JsonIgnore var deletedAt: java.time.Instant? = null,
    // 카테고리(PostCategory). 수정 API 에서 변경 가능. positional 생성 호출과의 호환을 위해 마지막 파라미터.
    @Column(nullable = false, length = 20) var category: String = PostCategory.SHARING,
    // 첨부파일(공지·주보 전용). 기존 row 는 NULL 이므로 nullable — 읽을 때 orEmpty() 로 다룬다.
    @JdbcTypeCode(SqlTypes.JSON) @Column(columnDefinition = "json") var attachments: List<PostAttachment>? = null,
    // 조회수. 상세 조회마다 원자적 UPDATE 로 증가(중복 방어는 두지 않는다 — 교회 규모에선 단순함 우선).
    @Column(nullable = false) var views: Long = 0,
    // 익명 기도제목(PRAYER 전용). true 면 공개 응답에서 작성자를 마스킹한다 — DB 에는 authorUserId 가
    // 남아 본인 수정/삭제(ownedByMe)와 알림은 그대로 동작한다.
    @Column(nullable = false) val anonymous: Boolean = false,
    // 공개 범위(PostVisibility). MEMBERS = 로그인(승인 교인)만 열람 — PRAYER 전용.
    @Column(nullable = false, length = 20) var visibility: String = PostVisibility.PUBLIC,
    // 공지·주보 상단 고정 시각. null = 고정 아님. 스태프만 토글(PostService.setPinned).
    @Column(name = "pinned_at") var pinnedAt: java.time.Instant? = null,
    // 예약 게시 시각(공지·주보 전용). 예약 중에는 hiddenAt 도 세팅돼 공개에서 제외된다.
    @Column(name = "publish_at") var publishAt: java.time.Instant? = null,
)

/**
 * 초기 적재 시드. apps/web/src/data/posts.ts 와 1:1 미러. SeedRunner 가 비어있을 때만 저장.
 */
object PostSeed {
    private val worship = Photos.worship
    private val bible = Photos.bible
    private val community = Photos.community
    private val fellowship = Photos.fellowship
    private val serve = Photos.serve
    private val children = Photos.children

    val posts: List<Post> = listOf(
        Post("p1", Author("한빛교회", true), "2시간 전",
            "이번 주일 오후, 여름 청년 수련회 사전 모임이 있습니다. 신청하신 분들은 본당 앞으로 모여주세요.",
            listOf("#공지", "#청년부"), listOf(community[0]), 42, 0, "c1",
            category = PostCategory.NOTICE),
        Post("p2", Author("한빛교회", true), "5시간 전",
            "7월 둘째 주 주보입니다. 예배 순서와 교회 소식을 확인해 주세요.",
            listOf("#주보"), listOf(worship[0]), 18, 0,
            category = PostCategory.BULLETIN),
        Post("p3", Author("한빛교회", true), "어제",
            "주일 설교 — \"항상 기뻐하라\" (데살로니가전서 5:16-18). 지난 주일 말씀의 요약과 나눔 질문을 함께 올립니다.",
            listOf("#설교", "#주일예배"), emptyList(), 96, 0,
            category = PostCategory.SERMON),
        Post("p4", Author("사랑부", true), "2일 전",
            "토요일 반찬 나눔 봉사 후기. 열두 가정에 반찬을 전해드렸습니다. 함께해 주신 분들 감사합니다 🙏",
            listOf("#봉사", "#사랑부"), listOf(serve[0]), 87, 0, "c2",
            category = PostCategory.SHARING),
        Post("p5", Author("김은혜", false), "3일 전",
            "어머니 수술이 다음 주로 잡혔습니다. 수술이 잘 되도록 함께 기도해 주세요.",
            listOf("#기도요청"), emptyList(), 54, 0,
            category = PostCategory.PRAYER),
        Post("p6", Author("교육부", true), "4일 전",
            "봄 학기 성경공부반이 마쳤습니다. 로마서를 함께 읽으며 나눈 은혜를 사진으로 남깁니다.",
            listOf("#성경공부", "#교육부"), listOf(bible[4], bible[5]), 33, 0, "c5",
            category = PostCategory.SHARING),
        Post("p7", Author("이믿음", false), "5일 전",
            "새가족 등록하고 첫 목장 모임에 다녀왔습니다. 따뜻하게 맞아주셔서 감사했어요.",
            listOf("#새가족", "#목장"), listOf(fellowship[0]), 29, 0,
            category = PostCategory.SHARING),
        Post("p8", Author("한빛교회", true), "1주 전",
            "주일 설교 — \"선한 목자\" (시편 23편). 말씀 요약과 함께 한 주간 묵상 구절을 나눕니다.",
            listOf("#설교", "#주일예배"), emptyList(), 71, 0,
            category = PostCategory.SERMON),
        Post("p9", Author("주일학교", false), "1주 전",
            "여름성경학교 준비가 한창입니다. 교사로 함께해 주실 선생님들을 기다립니다!",
            listOf("#주일학교", "#여름성경학교"), listOf(children[4]), 38, 0, "c7",
            category = PostCategory.SHARING),
        Post("p10", Author("박소망", false), "2주 전",
            "취업을 준비하고 있습니다. 지치지 않고 걸어갈 수 있도록 기도 부탁드립니다.",
            listOf("#기도요청", "#청년부"), listOf(bible[1]), 45, 0,
            category = PostCategory.PRAYER),
    )
}
