"use client";

import Link from "next/link";
import { Eye, Heart, MessageCircle, Paperclip } from "lucide-react";
import { PostPreview } from "@/components/post-text";
import { isAdminOnlyCategory, postCategoryBadge, postTimeLabel, type Post } from "@/data/posts";

/**
 * 전통 게시판 형식의 게시글 목록(행 단위). 공지·주보 등 교회 공식 소식의 기본 뷰이며
 * 교제 페이지의 "리스트" 탭도 공유한다. 카드/피드 형식은 FeedPostCard 쪽.
 */
export function PostBoardList({ posts, showCategory = true }: { posts: Post[]; showCategory?: boolean }) {
  return (
    <ul
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {posts.map((post, index) => (
        <li key={post.id} style={index > 0 ? { borderTop: "1px solid var(--border)" } : undefined}>
          <Link
            href={`/posts/${post.id}`}
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[rgba(var(--ink-rgb),0.04)] sm:px-5"
          >
            {showCategory ? (() => {
              const badge = postCategoryBadge(post.category);
              return (
                <span
                  className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                >
                  <span aria-hidden>{badge.emoji}</span> {badge.label}
                </span>
              );
            })() : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <PostPreview
                  text={post.text}
                  className="truncate text-[14px] leading-6"
                  style={{ color: "var(--foreground)" }}
                  maxLength={90}
                />
                {post.attachments && post.attachments.length > 0 ? (
                  <Paperclip size={13} aria-label="첨부파일 있음" className="shrink-0" style={{ color: "var(--accent)" }} />
                ) : null}
                {/* 연결 행사 배지 — FeedPostCard(갤러리 뷰)와 동일한 pill 스타일 */}
                {post.eventId ? (
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
                    style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                  >
                    <span aria-hidden>🗓</span> 행사 연결
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                <span className="truncate">{post.author.name}</span>
                <span aria-hidden>·</span>
                <span className="shrink-0">{postTimeLabel(post)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
              {/* 교회 공식 소식(공지·주보)에는 좋아요를 노출하지 않는다 */}
              {isAdminOnlyCategory(post.category) ? null : (
                <span className="flex items-center gap-1">
                  <Heart size={12} aria-hidden /> {post.likes}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MessageCircle size={12} aria-hidden /> {post.comments}
              </span>
              {/* 교회에선 좋아요보다 조회가 중요한 지표 — 목록에도 함께 보여준다 */}
              <span className="hidden items-center gap-1 sm:flex">
                <Eye size={12} aria-hidden /> {post.views ?? 0}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
