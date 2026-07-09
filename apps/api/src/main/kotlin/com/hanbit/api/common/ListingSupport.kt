package com.hanbit.api.common

/**
 * 게시글·행사 목록/검색 도메인이 글자 단위로 동일하게 반복하던 상한·페이지 계산·bulk 존재조회 보일러플레이트를 모은다.
 * 각 서비스는 이 상수/함수를 import 해 기존 호출부를 그대로 유지한다.
 */
object ListingLimits {
    const val MAX_SEARCH_PAGE_SIZE = 50
    const val MAX_SEARCH_QUERY_LENGTH = 100
    const val MAX_SITEMAP_PAGE_SIZE = 500

    /** 게시글·행사 댓글 목록/딥링크 공통 페이지 상한. */
    const val MAX_COMMENT_PAGE_SIZE = 100
}

/** totalElements 를 size 로 나눈 전체 페이지 수(0건이면 0). */
fun totalPages(totalElements: Long, size: Int): Int =
    if (totalElements == 0L) 0 else ((totalElements - 1) / size + 1).toInt()

/**
 * 현재 page 의 id 목록에 대한 "내가 표시한 것" 집합(좋아요/북마크/참여 등)을 만든다.
 * 비로그인이거나 빈 page 면 query 를 생략한다 — 각 도메인이 반복하던 null/empty 가드를 한 곳에 둔다.
 */
inline fun <ID> presenceByPage(
    userId: Long?,
    ids: List<ID>,
    query: (Long, List<ID>) -> Collection<ID>,
): Set<ID> = if (userId == null || ids.isEmpty()) emptySet() else query(userId, ids).toSet()
