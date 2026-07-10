"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Paperclip } from "lucide-react";
import { apiGet } from "@/lib/api";
import { HOME_NEWS_PREVIEW_SIZE, postCategoryBadge, postTimeLabel, type Post, type PostSearchResponse } from "@/data/posts";

const PREVIEW_SIZE = HOME_NEWS_PREVIEW_SIZE;

/**
 * 본문에서 제목(첫 줄)과 요약(나머지)을 뽑는다.
 * 리치 HTML 은 블록 요소 단위, 레거시 plain 은 개행 단위로 나눈다.
 * (홈은 클라이언트에서 fetch 후 렌더링하므로 DOMParser 사용 가능.)
 */
function splitTitleSummary(text: string): { title: string; summary: string } {
  const trimmed = text.trim();
  let lines: string[];
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    if (typeof document !== "undefined") {
      const doc = new DOMParser().parseFromString(trimmed, "text/html");
      const blocks = Array.from(doc.body.children)
        .map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean);
      lines = blocks.length > 0 ? blocks : [doc.body.textContent?.replace(/\s+/g, " ").trim() ?? ""];
    } else {
      lines = [trimmed.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()];
    }
  } else {
    lines = trimmed
      .split("\n")
      .map((line) => line.replace(/\*\*([^*]+)\*\*/g, "$1").trim())
      .filter(Boolean);
  }
  const [title = "", ...rest] = lines;
  return { title, summary: rest.join(" ") };
}

function NewsRow({ post, highlighted }: { post: Post; highlighted: boolean }) {
  const badge = postCategoryBadge(post.category);
  const { title, summary } = splitTitleSummary(post.text);

  return (
    <li style={{ borderBottom: "1px solid var(--border)" }}>
      <Link
        href={`/posts/${post.id}`}
        className={`flex min-h-11 flex-col gap-1 px-3 py-4 transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)] sm:px-4 ${
          highlighted ? "bg-[rgba(var(--ink-rgb),0.03)]" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            <span aria-hidden>{badge.emoji}</span> {badge.label}
          </span>
          <p className="line-clamp-1 min-w-0 flex-1 text-[15px] font-medium leading-6" style={{ color: "var(--heading)" }}>
            {title}
          </p>
          {post.attachments && post.attachments.length > 0 ? (
            <Paperclip size={13} aria-label="첨부파일 있음" className="shrink-0" style={{ color: "var(--accent)" }} />
          ) : null}
        </div>
        {summary ? (
          <p className="line-clamp-2 text-[13px] leading-6" style={{ color: "var(--foreground-muted)" }}>
            {summary}
          </p>
        ) : null}
        <div className="mt-0.5 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          <span className="truncate">{post.author.name}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{postTimeLabel(post)}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <MessageCircle size={12} aria-hidden /> {post.comments}
          </span>
        </div>
      </Link>
    </li>
  );
}

/** 홈 최신 소식(공지·주보) 미리보기 3개 — 전체 목록은 /news. 홈 전용 리스트 마크업(게시판 뷰는 PostBoardList).
 * initialPosts: 서버 컴포넌트(ISR)가 선주입한 목록 — 있으면 클라이언트 재요청을 생략한다. */
export function HomeNews({ initialPosts = null }: { initialPosts?: Post[] | null }) {
  const [posts, setPosts] = useState<Post[] | null>(initialPosts);

  useEffect(() => {
    // SSR 선주입이 있으면 첫 마운트 재요청 생략(내용 갱신은 ISR 재검증 주기가 담당).
    if (initialPosts !== null) return;
    let cancelled = false;
    const fetchCategory = (category: string) =>
      apiGet<PostSearchResponse>(`/api/posts/search?category=${category}&sort=latest&page=0&size=${PREVIEW_SIZE}`)
        .then((data) => data.content)
        .catch(() => [] as Post[]);

    Promise.all([fetchCategory("NOTICE"), fetchCategory("BULLETIN")]).then(([notices, bulletins]) => {
      if (!cancelled) setPosts([...notices, ...bulletins].slice(0, PREVIEW_SIZE));
    });
    return () => {
      cancelled = true;
    };
  }, [initialPosts]);

  return (
    <section className="px-6 pb-20 transition-colors" style={{ background: "var(--surface)" }}>
      <div className="mx-auto max-w-5xl">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--accent-strong)" }}>
          News
        </p>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <h2
            className="text-[26px] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
          >
            교회 소식
          </h2>
          <Link
            href="/news"
            className="flex min-h-11 items-center text-[13px] underline underline-offset-4"
            style={{ color: "var(--foreground-muted)" }}
          >
            소식 더보기
          </Link>
        </div>

        {posts === null ? (
          <p className="py-10 text-center text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            불러오는 중입니다…
          </p>
        ) : posts.length === 0 ? (
          <p
            className="rounded-2xl border py-10 text-center text-[14px]"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground-muted)" }}
          >
            아직 등록된 소식이 없어요.
          </p>
        ) : (
          // 카드 박스 대신 구분선 리스트 — 주변 카드 섹션들과 형태를 달리해 반복감을 줄인다.
          <ul style={{ borderTop: "1px solid var(--border)" }}>
            {posts.map((post, index) => (
              <NewsRow key={post.id} post={post} highlighted={index === 0} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
