"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import { apiGet } from "@/lib/api";
import { FallbackImage } from "@/components/fallback-image";
import { ListEmptyState } from "@/components/list-empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PostPreview } from "@/components/post-text";
import { StaggerItem } from "@/components/scroll-reveal";
import { extractYouTubeId } from "@/lib/youtube";
import { postCategoryLabel, type Post, type PostCategory, type PostSearchResponse } from "@/data/posts";

const PAGE_SIZE = 10;

type Result = { key: string; status: "success" | "error"; data: PostSearchResponse | null };

function youTubeThumb(post: Post): string | null {
  const videoId = extractYouTubeId(post.text);
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
}

/** 카테고리 필터 게시글 목록. 소식(/news)·설교(/sermons) 페이지가 공유한다. */
export function CategoryPostList({
  categories,
  emptyTitle,
}: {
  /** 탭으로 노출할 카테고리(1개면 탭 숨김). */
  categories: PostCategory[];
  emptyTitle: string;
}) {
  const [category, setCategory] = useState<PostCategory>(categories[0]);
  const [page, setPage] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  const requestKey = `${category}:${page}:${retryTick}`;

  useEffect(() => {
    let cancelled = false;
    apiGet<PostSearchResponse>(`/api/posts/search?category=${category}&sort=latest&page=${page}&size=${PAGE_SIZE}`)
      .then((data) => {
        if (!cancelled) setResult({ key: requestKey, status: "success", data });
      })
      .catch(() => {
        if (!cancelled) setResult({ key: requestKey, status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, [category, page, retryTick, requestKey]);

  const loading = result === null || result.key !== requestKey;

  return (
    <div>
      {categories.length > 1 ? (
        <div className="mb-6 flex gap-2" role="tablist" aria-label="카테고리">
          {categories.map((item) => {
            const active = item === category;
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
                className="rounded-full border px-4 py-2 text-[13px] font-medium"
                style={
                  active
                    ? { background: "var(--cta-bg)", borderColor: "var(--cta-bg)", color: "var(--cta-fg)" }
                    : { background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground-muted)" }
                }
              >
                {postCategoryLabel(item)}
              </button>
            );
          })}
        </div>
      ) : null}

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
        <ListEmptyState title={emptyTitle} />
      ) : (
        <>
          <ul className="space-y-4">
            {result.data.content.map((post, index) => {
              const thumb = post.images[0] ?? youTubeThumb(post);
              return (
                <StaggerItem key={post.id} index={index}>
                  <li>
                    <Link
                      href={`/posts/${post.id}`}
                      className="flex gap-5 rounded-2xl border p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
                      style={{ background: "var(--card)", borderColor: "var(--border)" }}
                    >
                      {thumb ? (
                        <div className="hidden h-24 w-36 shrink-0 overflow-hidden rounded-xl sm:block">
                          <FallbackImage src={thumb} alt="" decorative thumbnail className="h-full w-full object-cover" />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                          >
                            {postCategoryLabel(post.category)}
                          </span>
                          <span>{post.author.name}</span>
                          <span>·</span>
                          <span>{post.time}</span>
                        </div>
                        <PostPreview
                          text={post.text}
                          className="mt-2 line-clamp-2 text-[15px] leading-7"
                          style={{ color: "var(--foreground)" }}
                          maxLength={160}
                        />
                        <div className="mt-3 flex items-center gap-4 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                          <span className="flex items-center gap-1">
                            <Heart size={13} aria-hidden /> {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={13} aria-hidden /> {post.comments}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                </StaggerItem>
              );
            })}
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
