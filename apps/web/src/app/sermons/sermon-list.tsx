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
import type { Post, PostSearchResponse } from "@/data/posts";

const PAGE_SIZE = 10;

type Result = { key: string; status: "success" | "error"; data: PostSearchResponse | null };

type SermonEntry = { post: Post; info: SermonInfo };

const CTA_PILL = "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium";
const OUTLINE_PILL = "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium";
const ctaStyle = { background: "var(--cta-bg)", color: "var(--cta-fg)" } as const;
const outlineStyle = { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" } as const;

/** [영상 보기] — 유튜브가 있으면 새 탭, 없으면 상세로. */
function WatchButton({ entry, className = CTA_PILL, style = ctaStyle }: { entry: SermonEntry; className?: string; style?: React.CSSProperties }) {
  const { info, post } = entry;
  if (info.youtubeId) {
    return (
      <a href={youTubeWatchUrl(info.youtubeId)} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        <Play size={13} aria-hidden /> 영상 보기
      </a>
    );
  }
  return (
    <Link href={`/posts/${post.id}`} className={className} style={style}>
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
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
        <Link href={detail} aria-label={`${info.title} 자세히 보기`} className="block">
          <SermonThumb
            youtubeId={info.youtubeId}
            meta={{ serviceLabel: info.serviceLabel, title: info.title, scripture: info.scripture }}
            className="aspect-video h-full w-full md:aspect-auto md:min-h-[200px]"
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
            <Link href={`${detail}#summary`} className={OUTLINE_PILL} style={outlineStyle}>
              말씀 요약
            </Link>
            <Link href={`${detail}#questions`} className={OUTLINE_PILL} style={outlineStyle}>
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
  return (
    <StaggerItem index={index}>
      <li>
        <article
          className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:gap-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Link href={detail} aria-label={`${info.title} 자세히 보기`} className="block w-full shrink-0 sm:w-44">
            <SermonThumb youtubeId={info.youtubeId} className="aspect-video w-full rounded-xl" />
          </Link>
          <div className="min-w-0 flex-1">
            {/* 메타 한 줄: "주일 설교 · 1주 전 · 철마제일교회" */}
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              <span className="font-semibold" style={{ color: "var(--accent-strong)" }}>
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
                style={ctaStyle}
              />
              <Link
                href={detail}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium"
                style={outlineStyle}
              >
                자세히 보기
              </Link>
              {/* 설교는 좋아요·댓글을 노출하지 않는다 — 조회수만. */}
              <span className="ml-auto flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--foreground-muted)" }}>
                <span>조회 {post.views ?? 0}</span>
              </span>
            </div>
          </div>
        </article>
      </li>
    </StaggerItem>
  );
}

/** 설교 목록 — 최신 설교 강조 + 예배 구분 필터 칩 + 검색. /sermons 전용. */
export function SermonList() {
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<SermonServiceType | "ALL">("ALL");
  const [query, setQuery] = useState("");

  const requestKey = `${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    apiGet<PostSearchResponse>(`/api/posts/search?category=SERMON&sort=latest&page=${page}&size=${PAGE_SIZE}`)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryTick, requestKey]);

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

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = entries.filter(({ info }) => {
    if (filter !== "ALL" && info.serviceType !== filter) return false;
    if (!trimmedQuery) return true;
    return [info.title, info.scripture ?? "", info.preacher, info.summary]
      .join(" ")
      .toLowerCase()
      .includes(trimmedQuery);
  });

  const filterActive = filter !== "ALL" || trimmedQuery.length > 0;

  // 최신 1건 강조는 필터·검색이 없는 첫 페이지에서만. 아래 목록에서는 중복 노출하지 않는다.
  const showFeatured = page === 0 && !filterActive && filtered.length > 0;
  const featured = showFeatured ? filtered[0] : null;
  const listEntries = showFeatured ? filtered.slice(1) : filtered;

  return (
    <div>
      {loading ? (
        <p className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          불러오는 중입니다…
        </p>
      ) : result.status === "error" || !result.data ? (
        <div className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          목록을 불러오지 못했습니다.{" "}
          <button type="button" onClick={() => setRetryTick((t) => t + 1)} className="underline" style={{ color: "var(--foreground)" }}>
            다시 시도
          </button>
        </div>
      ) : result.data.content.length === 0 ? (
        <ListEmptyState
          title="등록된 설교가 없습니다."
          description="곧 더 많은 말씀을 확인하실 수 있습니다."
        />
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="설교 제목, 성경 본문, 설교자 검색"
                aria-label="설교 검색"
                className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none placeholder:opacity-50 [&::-webkit-search-cancel-button]:hidden"
                style={{ color: "var(--foreground)" }}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
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
                검색 결과 <span className="font-semibold" style={{ color: "var(--foreground)" }}>{filtered.length}</span>개
              </p>
            ) : null}
          </div>

          {listEntries.length === 0 && !featured ? (
            <ListEmptyState
              title="검색 결과가 없습니다."
              description="다른 키워드로 검색해 주세요."
            />
          ) : (
            <ul className="space-y-4">
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
