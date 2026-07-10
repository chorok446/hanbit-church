"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarHeart, FileText, Megaphone, MessageCircle, Paperclip, type LucideIcon } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FallbackImage } from "@/components/fallback-image";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SearchField } from "@/components/search-field";
import { StaggerItem } from "@/components/scroll-reveal";
import {
  postCategoryBadge,
  postCategoryLabel,
  type Post,
  type PostSearchResponse,
} from "@/data/posts";

const PAGE_SIZE = 10;

/** /news 에서 노출하는 교회 공식 소식 카테고리(탭 순서 고정). */
const NEWS_CATEGORIES = ["NOTICE", "BULLETIN"] as const;

type NewsCategory = (typeof NEWS_CATEGORIES)[number];

/** 공식 채널 카테고리별 lucide 아이콘(썸네일·뱃지에서 이모지 대체). */
const NEWS_CATEGORY_ICON: Record<NewsCategory, LucideIcon> = {
  NOTICE: Megaphone,
  BULLETIN: FileText,
};

/** 카테고리별 lucide 아이콘 렌더 — 컴포넌트를 render 중 생성하지 않도록 모듈 스코프 래퍼. */
function CategoryIcon({
  category,
  size,
  strokeWidth,
  className,
}: {
  category: string;
  size: number;
  strokeWidth?: number;
  className?: string;
}) {
  const Icon: LucideIcon = NEWS_CATEGORY_ICON[category as NewsCategory] ?? Megaphone;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}

type Result = { key: string; status: "success" | "error"; data: PostSearchResponse | null };

/** 탭별 빈 상태 문구 — 소식/주보가 아직 없어도 다음 방문을 안내한다. */
const EMPTY_STATES: Record<NewsCategory, { title: string; description: string }> = {
  NOTICE: { title: "등록된 소식이 없습니다.", description: "곧 새로운 소식을 전해드리겠습니다." },
  BULLETIN: {
    title: "등록된 주보가 없습니다.",
    description: "새로운 주보가 올라오면 이곳에서 확인하실 수 있습니다.",
  },
};

/**
 * 본문에서 제목(첫 줄/첫 블록)과 요약(나머지)을 분리한다.
 * 리치 HTML 은 블록 단위, 레거시 plain 텍스트는 줄 단위로 나눈다.
 */
function splitTitleSummary(text: string): { title: string; summary: string } {
  const trimmed = text.trim();
  if (/<[a-z][\s\S]*>/i.test(trimmed) && typeof document !== "undefined") {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const blocks = Array.from(doc.body.children)
      .map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "")
      .filter(Boolean);
    if (blocks.length > 0) return { title: blocks[0], summary: blocks.slice(1).join(" ") };
    const plain = doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
    return { title: plain, summary: "" };
  }
  const lines = trimmed
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { title: lines[0] ?? "", summary: lines.slice(1).join(" ") };
}

/** 썸네일이 없을 때 쓰는 카테고리별 네이비/골드 placeholder(sermon-thumb 관례). */
function NewsThumb({ post }: { post: Post }) {
  const thumb = post.images[0];
  if (thumb) {
    return <FallbackImage src={thumb} alt="" decorative thumbnail className="h-full w-full object-cover" />;
  }
  const badge = postCategoryBadge(post.category);
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-1.5"
      style={{ background: "var(--banner-bg)" }}
      aria-hidden
    >
      <CategoryIcon category={post.category} size={20} strokeWidth={1.75} className="text-[#f6f3ea]" />
      <span
        className="text-[11.5px] tracking-[0.22em] text-[#f6f3ea]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        {badge.label}
      </span>
      <span className="h-px w-7" style={{ background: "var(--accent)" }} />
    </div>
  );
}

function NewsCard({ post, index }: { post: Post; index: number }) {
  const badge = postCategoryBadge(post.category);
  const { title, summary } = splitTitleSummary(post.text);
  const hasAttachments = (post.attachments?.length ?? 0) > 0;
  return (
    <StaggerItem index={index}>
      <li>
        <Link
          href={`/posts/${post.id}`}
          className="flex gap-4 rounded-2xl border p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.35)] motion-reduce:transform-none sm:gap-5 sm:p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="hidden h-24 w-36 shrink-0 overflow-hidden rounded-xl sm:block">
            <NewsThumb post={post} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
              >
                <CategoryIcon category={post.category} size={11} strokeWidth={2} /> {badge.label}
              </span>
              {hasAttachments ? (
                <span
                  className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
                >
                  <Paperclip size={11} aria-hidden style={{ color: "var(--accent)" }} /> 첨부
                </span>
              ) : null}
              {post.eventId ? (
                <span
                  className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]"
                  style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
                >
                  <CalendarHeart size={11} aria-hidden style={{ color: "var(--accent)" }} /> 연결된 행사
                </span>
              ) : null}
            </div>
            <h3
              className="mt-2 truncate text-[17px] leading-snug sm:text-[18px]"
              style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
            >
              {title}
            </h3>
            {summary ? (
              <p className="mt-1 line-clamp-2 break-words text-[13.5px] leading-6" style={{ color: "var(--foreground-muted)" }}>
                {summary}
              </p>
            ) : null}
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              <span className="truncate">{post.author.name}</span>
              <span aria-hidden>·</span>
              <span className="shrink-0">{post.time}</span>
              <span aria-hidden>·</span>
              <span className="flex shrink-0 items-center gap-1">
                <MessageCircle size={12} aria-hidden /> {post.comments}
              </span>
            </div>
          </div>
        </Link>
      </li>
    </StaggerItem>
  );
}

/** 소식(/news) 전용 목록 — 공지·주보 탭(개수), 서버 검색(q), 카드 리스트. */
export function NewsPostList() {
  const [category, setCategory] = useState<NewsCategory>(NEWS_CATEGORIES[0]);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [counts, setCounts] = useState<Partial<Record<NewsCategory, number>>>({});

  const requestKey = `${category}:${page}:${query}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      category,
      sort: "latest",
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (query) params.set("q", query);
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
  }, [category, page, query, retryTick, requestKey]);

  // 탭 개수 — 카테고리별 size=1 병렬 호출로 totalElements 만 취한다. 실패한 탭은 개수를 숨긴다.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      NEWS_CATEGORIES.map((item) =>
        apiGet<PostSearchResponse>(`/api/posts/search?category=${item}&sort=latest&page=0&size=1`)
          .then((data) => [item, data.totalElements] as const)
          .catch(() => [item, undefined] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setCounts(Object.fromEntries(entries.filter(([, count]) => count !== undefined)));
    });
    return () => {
      cancelled = true;
    };
  }, [retryTick]);

  const loading = result === null || result.key !== requestKey;
  const searching = query.length > 0;

  return (
    <div>
      <div className="mb-4 flex gap-2" role="tablist" aria-label="소식 카테고리">
        {NEWS_CATEGORIES.map((item) => {
          const active = item === category;
          const count = counts[item];
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setCategory(item);
                setPage(0);
              }}
              className="rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors"
              style={
                active
                  ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                  : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground-muted)" }
              }
            >
              {postCategoryLabel(item)}
              {count !== undefined ? (
                <span className="ml-1.5 text-[11.5px] tabular-nums opacity-70">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <SearchField
        value={query}
        onCommit={(next) => {
          setQuery(next);
          setPage(0);
        }}
        placeholder="소식 내용, 작성자 검색"
        label="소식 검색"
        loading={loading}
        className="mb-6"
      />

      {loading ? (
        <p className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          불러오는 중입니다…
        </p>
      ) : result.status === "error" || !result.data ? (
        <div className="py-16 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
          목록을 불러오지 못했습니다.{" "}
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="underline"
            style={{ color: "var(--foreground)" }}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <>
          {searching ? (
            <p className="mb-4 text-[13px]" style={{ color: "var(--foreground-muted)" }} aria-live="polite">
              검색 결과{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                {result.data.totalElements.toLocaleString()}
              </span>
              개
            </p>
          ) : null}

          {result.data.content.length === 0 ? (
            searching ? (
              <ListEmptyState title="검색 결과가 없습니다." description="다른 키워드로 검색해 주세요." />
            ) : (
              <ListEmptyState
                title={EMPTY_STATES[category].title}
                description={EMPTY_STATES[category].description}
              />
            )
          ) : (
            <ul className="space-y-3.5">
              {result.data.content.map((post, index) => (
                <NewsCard key={post.id} post={post} index={index} />
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
