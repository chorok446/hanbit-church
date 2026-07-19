"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, Search, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SermonThumb } from "@/components/sermon-thumb";
import { StaggerItem } from "@/components/scroll-reveal";
import {
  SERMON_FILTERS,
  parseSermonInfo,
  youTubeWatchUrl,
  type SermonInfo,
  type SermonServiceType,
} from "@/data/sermons";
import { SERMON_PAGE_SIZE, type Post, type PostSearchResponse } from "@/data/posts";

const PAGE_SIZE = SERMON_PAGE_SIZE;

type Result = { key: string; status: "success" | "error"; data: PostSearchResponse | null };

type SermonEntry = { post: Post; info: SermonInfo };

const CTA_PILL = "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium";
const OUTLINE_PILL = "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium cta-outline";

/** [영상 보기] — 유튜브가 있으면 새 탭, 없으면 상세로. 색·hover 는 cta-solid 로 중앙화. */
function WatchButton({ entry, className = CTA_PILL }: { entry: SermonEntry; className?: string }) {
  const { info, post } = entry;
  const cls = `${className} cta-solid`;
  if (info.youtubeId) {
    return (
      <a href={youTubeWatchUrl(info.youtubeId)} target="_blank" rel="noopener noreferrer" className={cls}>
        <Play size={13} aria-hidden /> 영상 보기
      </a>
    );
  }
  return (
    <Link href={`/posts/${post.id}`} className={cls}>
      <Play size={13} aria-hidden /> 영상 보기
    </Link>
  );
}

/** 목록 위 최신 설교 강조 영역. */
function FeaturedSermon({ entry }: { entry: SermonEntry }) {
  const { post, info } = entry;
  const detail = `/posts/${post.id}`;
  return (
    <section
      aria-label="최신 설교"
      className="mb-8 overflow-hidden rounded-3xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr]">
        <Link href={detail} className="block">
          <SermonThumb
            youtubeId={info.youtubeId}
            meta={{ serviceLabel: info.serviceLabel, title: info.title, scripture: info.scripture }}
            className="aspect-video h-full w-full md:aspect-auto md:min-h-[220px]"
          />
        </Link>
        <div className="flex flex-col gap-2.5 p-6 sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: "var(--accent-strong)" }}>
            최신 설교 · {info.serviceLabel}
          </p>
          <Link href={detail} className="hover:opacity-80">
            <h2
              className="text-[24px] leading-snug sm:text-[27px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              {info.title}
            </h2>
          </Link>
          {info.scripture ? (
            <p className="text-[15.5px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>
              {info.scripture}
            </p>
          ) : null}
          <p className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            {info.date} · {info.preacher}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <WatchButton entry={entry} />
            <Link href={`${detail}#summary`} className={OUTLINE_PILL}>
              말씀 요약
            </Link>
            <Link href={`${detail}#questions`} className={OUTLINE_PILL}>
              나눔 질문
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SermonCard({ entry, index }: { entry: SermonEntry; index: number }) {
  const { post, info } = entry;
  const detail = `/posts/${post.id}`;
  // 에디토리얼 리스트: border-b 로 구분, 썸네일(190·16:9) | 본문.
  // ul 직계 자식은 li 여야 하므로(a11y) 애니메이션 래퍼는 li 안쪽에 둔다.
  return (
    <li className="border-b" style={{ borderColor: "var(--border)" }}>
      <StaggerItem index={index} className="grid grid-cols-1 gap-4 py-7 sm:grid-cols-[190px_1fr] sm:gap-6">
        <Link href={detail} className="block w-full shrink-0">
          <SermonThumb
            youtubeId={info.youtubeId}
            meta={{ serviceLabel: info.serviceLabel, title: info.title, scripture: info.scripture }}
            className="aspect-video w-full overflow-hidden rounded-xl"
          />
        </Link>
        <div className="min-w-0">
          {/* 메타 한 줄: "주일 설교 · 1주 전 · 한빛교회" (유형=골드) */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
            <span className="font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--accent-strong)" }}>
              {info.serviceLabel}
            </span>
            <span aria-hidden>·</span>
            <span>{info.date}</span>
            <span aria-hidden>·</span>
            <span>{post.author.name}</span>
          </div>
          <Link href={detail} className="hover:opacity-80">
            <h3
              className="mt-2 text-[19px] leading-snug"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              {info.title}
            </h3>
          </Link>
          {info.scripture ? (
            <p className="mt-1 text-[14.5px]" style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--foreground)" }}>
              {info.scripture}
            </p>
          ) : null}
          {info.summary ? (
            <p className="mt-2 line-clamp-2 text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
              {info.summary}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <WatchButton
              entry={entry}
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium"
            />
            <Link
              href={detail}
              className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium cta-outline"
            >
              자세히 보기
            </Link>
            {/* 설교는 좋아요·댓글을 노출하지 않는다 — 조회수만. */}
            <span className="ml-auto flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--foreground-muted)" }}>
              <span>조회 {post.views ?? 0}</span>
            </span>
          </div>
        </div>
      </StaggerItem>
    </li>
  );
}

/** 설교 목록 — 최신 설교 강조 + 예배 구분 필터 칩 + 검색. /sermons 전용.
 * initialData: 서버 컴포넌트(ISR)가 선주입한 첫 페이지 — 첫 페인트·크롤러가 빈 목록을 보지 않는다. */
export function SermonList({ initialData = null }: { initialData?: PostSearchResponse | null }) {
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(
    initialData ? { key: "0::0", status: "success", data: initialData } : null,
  );
  const [filter, setFilter] = useState<SermonServiceType | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const requestKey = `${page}:${trimmedQuery}:${retryTick}`;

  useEffect(() => {
    // 현재 요청 key 의 결과(성공·실패 모두)가 이미 있으면 재요청하지 않는다 —
    // SSR 선주입 데이터의 첫 마운트 중복 요청 방지 + 실패 시 재시도는 retryTick(새 key)으로만.
    if (result?.key === requestKey) return;
    let cancelled = false;
    const params = new URLSearchParams({
      category: "SERMON",
      sort: "latest",
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (trimmedQuery) params.set("q", trimmedQuery);
    apiGet<PostSearchResponse>(`/api/posts/search?${params.toString()}`)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [page, trimmedQuery, retryTick, requestKey, result]);

  const loading = result === null || result.key !== requestKey;

  const entries: SermonEntry[] = useMemo(
    () => (result?.data?.content ?? []).map((post) => ({ post, info: parseSermonInfo(post) })),
    [result],
  );

  // 칩 개수는 현재 페이지에 로드된 데이터 기준(예배 구분별 전체 집계 API 가 없다).
  const counts = useMemo(() => {
    const map: Record<SermonServiceType | "ALL", number> = { ALL: entries.length, SUNDAY: 0, WEDNESDAY: 0, DAWN: 0, SPECIAL: 0 };
    for (const { info } of entries) map[info.serviceType] += 1;
    return map;
  }, [entries]);

  // 자유 검색어(query)는 서버로 넘긴다. 예배 구분(SUNDAY/…)은 본문에서 파싱하는 값이라
  // 서버 필드가 없어 로드된 페이지 안에서만 클라이언트로 좁힌다.
  const searching = trimmedQuery.length > 0;
  const filtered = entries.filter(({ info }) => filter === "ALL" || info.serviceType === filter);

  const filterActive = filter !== "ALL" || searching;

  // 최신 1건 강조는 필터·검색이 없는 첫 페이지에서만. 아래 목록에서는 중복 노출하지 않는다.
  const showFeatured = page === 0 && !filterActive && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const listEntries = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div>
      {loading ? (
        <p role="status" className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          불러오는 중입니다…
        </p>
      ) : result.status === "error" || !result.data ? (
        <div role="alert" className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          목록을 불러오지 못했습니다.{" "}
          <button type="button" onClick={() => setRetryTick((t) => t + 1)} className="underline" style={{ color: "var(--foreground)" }}>
            다시 시도
          </button>
        </div>
      ) : result.data.content.length === 0 ? (
        searching ? (
          <ListEmptyState
            title="검색 결과가 없습니다."
            description="다른 키워드로 검색해 주세요."
          />
        ) : (
          <ListEmptyState
            title="등록된 설교가 없습니다."
            description="곧 더 많은 말씀을 확인하실 수 있습니다."
          />
        )
      ) : (
        <>
          {featured ? <FeaturedSermon entry={featured} /> : null}

          <div className="mb-6 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="예배 구분 필터">
              {SERMON_FILTERS.map((item) => {
                const active = item.value === filter;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(item.value)}
                    className="rounded-full border px-4 py-2 text-[13px] font-medium"
                    style={
                      active
                        ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                        : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground-muted)" }
                    }
                  >
                    {item.label} <span className="opacity-60">{counts[item.value]}</span>
                  </button>
                );
              })}
            </div>
            <div
              className="flex items-center gap-2.5 rounded-full border px-4 py-2.5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <Search size={15} aria-hidden style={{ color: "var(--foreground-muted)" }} />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="설교 제목, 성경 본문, 설교자 검색"
                aria-label="설교 검색"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:opacity-50 [&::-webkit-search-cancel-button]:hidden"
                style={{ color: "var(--foreground)" }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  aria-label="검색어 지우기"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                  style={{ background: "var(--chip-bg)", color: "var(--foreground-muted)" }}
                >
                  <X size={12} aria-hidden />
                </button>
              ) : null}
            </div>
            {filterActive ? (
              <p aria-live="polite" className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
                검색 결과{" "}
                <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                  {searching && filter === "ALL" ? result.data.totalElements : filtered.length}
                </span>
                개
              </p>
            ) : null}
          </div>

          {listEntries.length === 0 && !featured ? (
            <ListEmptyState
              title="검색 결과가 없습니다."
              description="다른 키워드로 검색해 주세요."
            />
          ) : (
            <ul className="border-t" style={{ borderColor: "var(--border)" }}>
              {listEntries.map((entry, index) => (
                <SermonCard key={entry.post.id} entry={entry} index={index} />
              ))}
            </ul>
          )}

          {result.data.totalPages > 1 ? (
            <div className="mt-8">
              <Pagination page={page} totalPages={result.data.totalPages} onPageChange={setPage} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
