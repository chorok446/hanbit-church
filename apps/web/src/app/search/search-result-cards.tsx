"use client";

import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Users } from "lucide-react";
import { AuthorHeader } from "@/components/author-header";
import { Avatar } from "@/components/avatar";
import { FallbackImage } from "@/components/fallback-image";
import { ReportButton } from "@/components/report-button";
import { eventRecruitMeta, type Event } from "@/data/events";
import { postCategoryBadge, postTimeLabel, type Post } from "@/data/posts";
import type { PublicUser } from "@/data/users";
import { progressPercent } from "@/lib/progress";
import { richTextPlainPreview } from "@/lib/rich-text-length";
import { SearchHighlight } from "./search-highlight";

export function EventResultCard({ event, highlight }: { event: Event; highlight?: string }) {
  const progress = progressPercent(event.joined, event.capacity);
  const meta = eventRecruitMeta(event);

  return (
    <div className="relative">
      <ReportButton
        targetType="EVENT"
        targetId={event.id}
        ownedByMe={event.ownedByMe}
        className="absolute left-3 top-3 z-20 !px-2.5 !py-1.5"
      />
      <Link
        href={`/events/${event.id}`}
        className="group block overflow-hidden rounded-2xl border transition-transform hover:-translate-y-1"
        style={{
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {event.thumb ? (
            <FallbackImage
              src={event.thumb}
              alt={`${event.title} 행사 이미지`}
              thumbnail
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[var(--heading)] to-[var(--accent-strong)] text-[12px] text-white/70">
              행사 이미지 없음
            </div>
          )}
          <span
            className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] tracking-[0.15em]"
            style={{ background: meta.color, color: meta.fg }}
          >
            {meta.label}
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <h3 className="line-clamp-1 text-[17px] font-semibold" style={{ color: "var(--foreground)" }}>
              <SearchHighlight text={event.title} query={highlight} />
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 opacity-65" style={{ color: "var(--foreground)" }}>
              <SearchHighlight text={event.summary} query={highlight} />
            </p>
          </div>
          <div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${progress}%`, background: meta.color }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] opacity-60" style={{ color: "var(--foreground)" }}>
              <span className="flex items-center gap-1.5">
                <Users size={12} /> {event.joined} / {event.capacity}명
              </span>
              <span>{event.daysLeftLabel}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function UserResultCard({ user, highlight }: { user: PublicUser; highlight?: string }) {
  // 공개 프로필 정보(이름·아바타·게시글 수)만 노출한다 — 이메일·연락처 없음.
  return (
    <Link
      href={`/users/${user.id}`}
      className="flex items-center gap-3 rounded-2xl border p-4 transition-transform hover:-translate-y-0.5"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <Avatar name={user.name} verified={user.verified} src={user.profileImageUrl ?? undefined} size={44} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium" style={{ color: "var(--foreground)" }}>
          <SearchHighlight text={user.name} query={highlight} />
        </p>
        <p className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
          게시글 {user.postCount.toLocaleString("ko-KR")}개
        </p>
      </div>
    </Link>
  );
}

export function PostResultCard({ post, highlight }: { post: Post; highlight?: string }) {
  const image = post.images[0];
  const badge = postCategoryBadge(post.category);
  const preview = richTextPlainPreview(post.text, 200);

  return (
    <article
      className="group overflow-hidden rounded-2xl border transition-transform hover:-translate-y-1"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3 p-4">
        <AuthorHeader
          className="flex-1 text-[13px] font-medium"
          name={post.author.name}
          nameContent={<SearchHighlight text={post.author.name} query={highlight} />}
          verified={post.author.verified}
          profileImageUrl={post.author.profileImageUrl}
          authorId={post.authorId}
          time={postTimeLabel(post)}
          timeClassName="text-[11px] opacity-50"
        />
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px]"
          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
        >
          {badge.emoji} {badge.label}
        </span>
        {post.bookmarkedByMe ? <Bookmark size={15} fill="var(--accent)" className="shrink-0 text-[var(--accent)]" /> : null}
      </div>
      <Link href={`/posts/${post.id}`} className="block">
        {image ? (
          <div className="aspect-[16/9] overflow-hidden">
            <FallbackImage
              src={image}
              alt="게시글 미리보기 이미지"
              thumbnail
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-[#1f2a44] to-[#44557a] px-6 text-center text-[13px] leading-6 text-white/75">
            {richTextPlainPreview(post.text, 90)}
          </div>
        )}
        <div className="space-y-3 p-4">
          <p className="line-clamp-3 break-words text-[14px] leading-6" style={{ color: "var(--foreground)" }}>
            <SearchHighlight text={preview} query={highlight} />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] text-[var(--accent-strong)]">
                <SearchHighlight text={tag} query={highlight} />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 border-t pt-3 text-[12px] opacity-65" style={{ borderColor: "var(--border)", color: "var(--foreground)" }}>
            <span className="flex items-center gap-1" style={post.likedByMe ? { color: "var(--danger)" } : undefined}>
              <Heart size={13} fill={post.likedByMe ? "var(--danger)" : "none"} /> {post.likes}
            </span>
            <span className="flex items-center gap-1"><MessageCircle size={13} /> {post.comments}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
