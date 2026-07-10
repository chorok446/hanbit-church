package com.cheolma.api.event

import com.cheolma.api.common.QUERYDSL_LIKE_ESCAPE
import com.cheolma.api.common.literalContainsPattern
import com.querydsl.core.BooleanBuilder
import com.querydsl.core.types.dsl.CaseBuilder
import com.querydsl.core.types.dsl.Expressions
import com.querydsl.core.types.OrderSpecifier
import com.querydsl.jpa.impl.JPAQueryFactory
import org.springframework.stereotype.Repository

enum class EventSearchSort {
    LATEST,
    POPULAR,
    DEADLINE,

    /** 관련순 — 제목 일치가 요약 일치보다 상위, 각각 등장 위치가 앞일수록 상위. 검색어 없으면 LATEST. */
    RELEVANCE,
}

data class EventSearchCondition(
    val query: String?,
    val status: String?,
    val recruitState: EventRecruitState?,
    val availableOnly: Boolean,
    val recruitEndFrom: String?,
    val recruitEndTo: String?,
    val runStartFrom: String?,
    val runStartTo: String?,
    val today: String,
    val sort: EventSearchSort,
    val page: Int,
    val size: Int,
)

data class EventSearchResult(
    val content: List<Event>,
    val totalElements: Long,
)

interface EventSearchRepository {
    fun search(condition: EventSearchCondition): EventSearchResult
}

@Repository
class QuerydslEventSearchRepository(
    private val queryFactory: JPAQueryFactory,
) : EventSearchRepository {
    override fun search(condition: EventSearchCondition): EventSearchResult {
        val event = QEvent.event
        val predicates = BooleanBuilder()
        // 숨김 콘텐츠는 공개 검색에서 항상 제외.
        predicates.and(event.hiddenAt.isNull)

        condition.query?.let { query ->
            val pattern = literalContainsPattern(query)
            predicates.and(
                event.title.lower().like(pattern, QUERYDSL_LIKE_ESCAPE)
                    .or(event.summary.lower().like(pattern, QUERYDSL_LIKE_ESCAPE)),
            )
        }
        condition.status?.let { predicates.and(event.status.eq(it)) }
        condition.recruitState?.let { recruitState ->
            predicates.and(
                when (recruitState) {
                    EventRecruitState.BEFORE_RECRUIT -> event.status.eq("upcoming")
                        .or(
                            event.status.eq("open")
                                .and(event.recruitStart.gt(condition.today)),
                        )
                    EventRecruitState.RECRUITING -> event.status.eq("open")
                        .and(event.recruitStart.loe(condition.today))
                        .and(event.recruitEnd.goe(condition.today))
                    EventRecruitState.ENDED -> event.status.eq("open")
                        .and(event.recruitEnd.lt(condition.today))
                    EventRecruitState.CLOSED -> event.status.eq("closed")
                },
            )
        }
        if (condition.availableOnly) {
            predicates.and(event.status.eq("open"))
            predicates.and(event.joined.lt(event.capacity))
            predicates.and(event.recruitStart.loe(condition.today))
            predicates.and(event.recruitEnd.goe(condition.today))
        }
        condition.recruitEndFrom?.let { predicates.and(event.recruitEnd.goe(it)) }
        condition.recruitEndTo?.let { predicates.and(event.recruitEnd.loe(it)) }
        condition.runStartFrom?.let { predicates.and(event.runStart.goe(it)) }
        condition.runStartTo?.let { predicates.and(event.runStart.loe(it)) }

        val content = queryFactory
            .selectFrom(event)
            .where(predicates)
            .orderBy(*orderSpecifiers(event, condition.sort, condition.query))
            .offset(condition.page.toLong() * condition.size)
            .limit(condition.size.toLong())
            .fetch()

        val totalElements = queryFactory
            .select(event.count())
            .from(event)
            .where(predicates)
            .fetchOne() ?: 0L

        return EventSearchResult(content = content, totalElements = totalElements)
    }

    private fun orderSpecifiers(event: QEvent, sort: EventSearchSort, query: String?): Array<OrderSpecifier<*>> =
        when (sort) {
            EventSearchSort.LATEST -> arrayOf(event.seq.desc(), event.id.asc())
            EventSearchSort.POPULAR -> arrayOf(event.joined.desc(), event.seq.desc(), event.id.asc())
            EventSearchSort.DEADLINE -> arrayOf(
                CaseBuilder().`when`(event.status.eq("open")).then(0).otherwise(1).asc(),
                event.recruitEnd.asc(),
                event.seq.desc(),
                event.id.asc(),
            )
            EventSearchSort.RELEVANCE -> relevanceOrder(event, query)
        }

    /**
     * 관련순: 제목 locate < 요약 locate 순으로 묶고(제목 일치 우선), 각 묶음 안에서는 등장 위치가
     * 앞일수록 상위. 동률은 최신순. locate 는 JPQL 표준 함수라 H2·MySQL 공용.
     */
    private fun relevanceOrder(event: QEvent, query: String?): Array<OrderSpecifier<*>> {
        val keyword = query?.trim()?.lowercase()
        if (keyword.isNullOrEmpty()) return arrayOf(event.seq.desc(), event.id.asc())
        val titlePosition = Expressions.numberTemplate(
            Int::class.javaObjectType, "locate({0}, lower({1}))", keyword, event.title,
        )
        val summaryPosition = Expressions.numberTemplate(
            Int::class.javaObjectType, "locate({0}, lower({1}))", keyword, event.summary,
        )
        val rank = CaseBuilder()
            .`when`(titlePosition.gt(0)).then(titlePosition)
            .`when`(summaryPosition.gt(0)).then(summaryPosition.add(SUMMARY_MATCH_OFFSET))
            .otherwise(NO_MATCH_RANK)
        return arrayOf(rank.asc(), event.seq.desc(), event.id.asc())
    }

    private companion object {
        const val SUMMARY_MATCH_OFFSET = 10_000
        const val NO_MATCH_RANK = 1_000_000
    }

}
