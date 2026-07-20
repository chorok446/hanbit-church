"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search, X } from "lucide-react";
import { apiGet } from "@/lib/api";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StaggerItem } from "@/components/scroll-reveal";
import { bulletinPdf, bulletinTitle } from "@/data/bulletins";
import { BULLETIN_PAGE_SIZE, postTimeLabel, type Post, type PostSearchResponse } from "@/data/posts";

const PAGE_SIZE = BULLETIN_PAGE_SIZE;

type Result = { key: string; status: "success" | "error"; data: PostSearchResponse | null };

/** 목록 카드용 날짜 라벨 — createdAt 이 있으면 절대 시각의 날짜 부분만("2026.7.13"),
 * 없으면(시드 글) 저장된 time 라벨을 그대로("3일 전") 쓴다. */
function bulletinDateLabel(post: Post): string {
  const label = postTimeLabel(post);
  return post.createdAt ? label.split(" ")[0] : label;
}

function BulletinCard({ post, index }: { post: Post; index: number }) {
  const title = bulletinTitle(post);
  const hasPdf = bulletinPdf(post) !== null;
  return (
    <li>
      <StaggerItem index={index}>
        <Link
          href={`/posts/${post.id}`}
          className="card-lift flex h-full flex-col gap-3 rounded-2xl border p-5"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div
            className="flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl"
            style={{ background: "var(--banner-bg)" }}
            aria-hidden
          >
            <FileText size={22} strokeWidth={1.75} className="text-[var(--on-banner)]" />
            <span className="h-px w-7" style={{ background: "var(--accent)" }} />
          </div>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--accent-strong)" }}
          >
            {bulletinDateLabel(post)}
          </p>
          <h3
            className="line-clamp-2 text-[17px] leading-snug"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            {title}
          </h3>
          <span className="mt-auto flex items-center gap-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
            <FileText size={12} aria-hidden />
            {hasPdf ? "PDF 바로 보기" : "자세히 보기"}
          </span>
        </Link>
      </StaggerItem>
    </li>
  );
}

/** 주보 아카이브 — 주차별 카드 그리드 + 날짜·제목 검색 + 페이지네이션. /bulletin 전용.
 * initialData: 서버 컴포넌트(ISR)가 선주입한 첫 페이지(설교·소식과 동일한 시드 재사용 패턴). */
export function BulletinList({ initialData = null }: { initialData?: PostSearchResponse | null }) {
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(
    initialData ? { key: "0::0", status: "success", data: initialData } : null,
  );
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim();
  const requestKey = `${page}:${trimmedQuery}:${retryTick}`;

  useEffect(() => {
    // 현재 key 의 결과(성공·실패)가 있으면 재요청하지 않는다 — 시드 첫 마운트 중복 방지, 재시도는 retryTick 으로만.
    if (result?.key === requestKey) return;
    let cancelled = false;
    const params = new URLSearchParams({
      category: "BULLETIN",
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
  const searching = trimmedQuery.length > 0;
  const posts = useMemo(() => result?.data?.content ?? [], [result]);

  return (
    <div>
      <div className="mb-6 flex items-center gap-2.5 rounded-full border px-4 py-2.5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <Search size={15} aria-hidden style={{ color: "var(--foreground-muted)" }} />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="주보 날짜·제목 검색"
          aria-label="주보 검색"
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
      ) : posts.length === 0 ? (
        searching ? (
          <ListEmptyState title="검색 결과가 없습니다." description="다른 키워드로 검색해 주세요." />
        ) : (
          <ListEmptyState title="등록된 주보가 없습니다." description="새로운 주보가 올라오면 이곳에서 확인하실 수 있습니다." />
        )
      ) : (
        <>
          {searching ? (
            <p aria-live="polite" className="mb-4 text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
              검색 결과{" "}
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                {result.data.totalElements}
              </span>
              개
            </p>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <BulletinCard key={post.id} post={post} index={index} />
            ))}
          </ul>
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
