package com.hanbit.api.post

import jakarta.persistence.LockModeType
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface PostRepository : JpaRepository<Post, String> {
    fun findAllByIdInOrderBySeqDesc(ids: Collection<String>): List<Post>

    /**
     * 사용자가 저장(북마크)한 게시글 중 공개(숨김·삭제 아님)만 페이지네이션한다.
     * bookmark row 를 그대로 페이지한 뒤 숨김을 거르면 total 은 필터 전 수라 슬라이스와 어긋나(마지막 페이지가
     * 비어 보이고 카운트 과대) 문제였다. JOIN 으로 공개 글만 페이지·카운트해 정합을 맞춘다.
     * order by p.seq desc, p.id — 게시글 최신순(레거시 비페이지 배열과 동일 정렬), id 는 seq 동률 tiebreak(결정적 페이지 경계).
     */
    @Query(
        "select p from Post p, PostBookmark b " +
            "where b.postId = p.id and b.userId = :userId and p.hiddenAt is null order by p.seq desc, p.id asc",
    )
    fun findVisibleBookmarkedByUser(@Param("userId") userId: Long, pageable: Pageable): Page<Post>

    /** 예약 게시 잡 — 도래한 예약 글(운영 숨김 아님, 마커 일치)만 집는다. */
    fun findByPublishAtLessThanEqualAndHiddenAtIsNotNullAndHiddenReason(
        publishAt: java.time.Instant,
        hiddenReason: String,
    ): List<Post>

    // 관리자 콘텐츠 관리 목록 — 숨김 포함 전체 / 숨김만 (+ 본문/작성자 검색).
    fun findAllByOrderBySeqDesc(pageable: Pageable): Page<Post>
    fun findByHiddenAtIsNotNullOrderBySeqDesc(pageable: Pageable): Page<Post>
    fun findByTextContainingIgnoreCaseOrAuthorNameContainingIgnoreCaseOrderBySeqDesc(
        text: String,
        authorName: String,
        pageable: Pageable,
    ): Page<Post>
    fun findByHiddenAtIsNotNullAndTextContainingIgnoreCaseOrderBySeqDesc(text: String, pageable: Pageable): Page<Post>

    // 관리자 통계용. seq 는 작성 시각(epoch millis)이므로 기간 내 값만 가져와 일 단위로 집계한다.
    @Query("select p.seq from Post p where p.seq >= :since")
    fun creationSeqSince(@Param("since") since: Long): List<Long>

    fun findByAuthorUserIdOrderBySeqDesc(authorUserId: Long): List<Post>

    fun findByAuthorUserId(authorUserId: Long, pageable: Pageable): Page<Post>

    // 작성자 본인 목록(mine)용. 숨김은 보이지만 삭제(soft delete)는 제외한다.
    fun findByAuthorUserIdAndDeletedAtIsNullOrderBySeqDesc(authorUserId: Long): List<Post>

    fun findByAuthorUserIdAndDeletedAtIsNull(authorUserId: Long, pageable: Pageable): Page<Post>

    fun countByAuthorUserId(authorUserId: Long): Long

    // 공개 노출 경로용(숨김 제외). 작성자 본인 목록(mine)은 위의 무필터 메서드를 그대로 쓴다.
    fun findByHiddenAtIsNull(sort: org.springframework.data.domain.Sort): List<Post>

    fun findByAuthorUserIdAndHiddenAtIsNull(authorUserId: Long, pageable: Pageable): Page<Post>

    // 공개 프로필용 — 익명 기도제목은 프로필 목록·게시글 수에서 제외해 작성자 연결을 차단한다.
    fun findByAuthorUserIdAndAnonymousFalseAndHiddenAtIsNull(authorUserId: Long, pageable: Pageable): Page<Post>

    // 비로그인 프로필 조회용 — 교인만 공개(MEMBERS)까지 제외한다.
    fun findByAuthorUserIdAndAnonymousFalseAndVisibilityAndHiddenAtIsNull(
        authorUserId: Long,
        visibility: String,
        pageable: Pageable,
    ): Page<Post>
    // 공개 프로필 게시글 수 — 익명 기도제목뿐 아니라 숨김(운영 차단) 글도 제외한다(공개 read 경로 규칙).
    fun countByAuthorUserIdAndAnonymousFalseAndHiddenAtIsNull(authorUserId: Long): Long

    /** 사용자 목록 매핑용 bulk 집계 — 사용자별 공개 게시글 수(익명 기도·숨김 제외). 사용자당 count N+1 방지. */
    @Query(
        """
        select new com.hanbit.api.post.AuthorPostCount(p.authorUserId, count(p))
        from Post p
        where p.authorUserId in :userIds and p.anonymous = false and p.hiddenAt is null
        group by p.authorUserId
        """,
    )
    fun countByAuthorUserIdsAndAnonymousFalse(@Param("userIds") userIds: Collection<Long>): List<AuthorPostCount>

    fun findAllByIdInAndHiddenAtIsNullOrderBySeqDesc(ids: Collection<String>): List<Post>

    /** 상호작용 동시성 방어용 write lock 조회. like/bookmark/comment 트랜잭션을 게시글별로 직렬화. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Post p where p.id = :id")
    fun findByIdForUpdate(@Param("id") id: String): Post?

    /** 행사 삭제 시 연결 게시글 존재 확인용. event_id 인덱스를 탄다. */
    fun existsByEventId(eventId: String): Boolean

    /** 조회수 원자적 증가. 동시 조회에서도 유실 없이 누적된다. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post p set p.views = p.views + 1 where p.id = :id")
    fun incrementViews(@Param("id") id: String): Int

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post p set p.author.name = :name, p.author.verified = false, p.author.profileImageUrl = null where p.authorUserId = :userId")
    fun anonymizeAuthor(@Param("userId") userId: Long, @Param("name") name: String): Int

    /** 프로필 변경 시 기존 작성물의 author snapshot(name·이미지)을 최신 값으로 맞춘다. verified 는 유지. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Post p set p.author.name = :name, p.author.profileImageUrl = :imageUrl where p.authorUserId = :userId")
    fun syncAuthorProfile(@Param("userId") userId: Long, @Param("name") name: String, @Param("imageUrl") imageUrl: String?): Int

    // sitemap 용 — 크롤러(비로그인) 대상이므로 교인만 공개(MEMBERS)는 제외한다.
    @Query("SELECT p.id FROM Post p WHERE p.hiddenAt IS NULL AND p.visibility = 'PUBLIC' ORDER BY p.seq DESC, p.id ASC")
    fun findIds(pageable: Pageable): Page<String>
}
