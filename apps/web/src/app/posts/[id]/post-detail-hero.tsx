"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  CalendarHeart,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { AuthorHeader } from "@/components/author-header";
import { IconPop } from "@/components/icon-pop";
import { FallbackImage } from "@/components/fallback-image";
import { PostText } from "@/components/post-text";
import { PostAttachments } from "@/components/post-attachments";
import { YouTubeEmbed } from "@/components/youtube-embed";
import { extractYouTubeId } from "@/lib/youtube";
import { isAdminOnlyCategory, postCategoryLabel, postTimeLabel } from "@/data/posts";
import { RichBodyImageGrid } from "@/components/rich-body-image-grid";
import { ShareButton } from "@/components/share-button";
import { TagLink } from "@/components/tag-link";
import type { Post } from "@/data/posts";
import type { Event } from "@/data/events";

export function PostDetailHero({
  post: p,
  linkedEvent,
  idx,
  imageFailed,
  likes,
  liked,
  liking,
  bookmarked,
  bookmarking,
  refreshing,
  commentCount,
  onImageError,
  onPrevImage,
  onNextImage,
  onLike,
  onBookmark,
  onOpenEvent,
  onScrollToComments,
}: {
  post: Post;
  linkedEvent: Event | null;
  idx: number;
  imageFailed: boolean;
  likes: number;
  liked: boolean;
  liking: boolean;
  bookmarked: boolean;
  bookmarking: boolean;
  refreshing: boolean;
  commentCount: number;
  onImageError: () => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onOpenEvent: (id: string) => void;
  onScrollToComments: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 22 });
  const sy = useSpring(my, { stiffness: 150, damping: 22 });
  const rY = useTransform(sx, [-0.5, 0.5], [-5, 5]);
  const rX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  // 교회 공식 소식(공지·주보)에는 좋아요를 노출하지 않는다.
  const officialNotice = isAdminOnlyCategory(p.category);

  return (
    <div style={{ perspective: 1400 }}>
      <motion.div
        ref={ref}
        onMouseMove={(e) => {
          const r = ref.current?.getBoundingClientRect();
          if (!r) return;
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onMouseLeave={() => {
          mx.set(0);
          my.set(0);
        }}
        style={{
          rotateX: rX,
          rotateY: rY,
          transformStyle: "preserve-3d",
          background: "var(--card)",
          borderColor: "var(--border)",
        }}
        className="rounded-3xl border overflow-hidden shadow-[0_40px_80px_-30px_rgba(0,0,0,0.4)] grid grid-cols-1 md:grid-cols-[1.1fr_1fr]"
      >
        <div className="relative aspect-square md:aspect-auto bg-black overflow-hidden">
          {imageFailed ? (
            <div className="flex h-full w-full items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ImageIcon size={32} color="rgba(255,255,255,0.35)" aria-hidden />
            </div>
          ) : (
            <motion.img
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={p.images[idx]}
              alt={`게시글 이미지 ${idx + 1}`}
              className="w-full h-full object-cover"
              onError={onImageError}
            />
          )}
          {p.images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrevImage}
                aria-label="이전 이미지"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(15,31,34,0.6)", color: "#fff" }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={onNextImage}
                aria-label="다음 이미지"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "rgba(15,31,34,0.6)", color: "#fff" }}
              >
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {p.images.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === idx ? "var(--accent)" : "rgba(255,255,255,0.4)" }} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-7 flex flex-col gap-5">
          <AuthorHeader
            name={p.author.name}
            verified={p.author.verified}
            profileImageUrl={p.author.profileImageUrl}
            authorId={p.authorId}
            avatarSize={40}
            time={p.edited ? `${postTimeLabel(p)} · 수정됨` : postTimeLabel(p)}
            className="min-w-0"
          />

          <span
            className="self-start rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em]"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
          >
            {postCategoryLabel(p.category)}
            {p.visibility === "MEMBERS" ? <span title="로그인한 교우만 볼 수 있는 글"> · 교인만 공개</span> : null}
          </span>

          {(() => {
            const videoId = extractYouTubeId(p.text);
            return videoId ? <YouTubeEmbed videoId={videoId} title="본문 영상" /> : null;
          })()}

          <PostText text={p.text} style={{ color: "var(--foreground)", lineHeight: 1.7 }} />

          <RichBodyImageGrid images={p.images} altPrefix="게시글 이미지" />

          <PostAttachments attachments={p.attachments} />

          <div className="flex flex-wrap gap-1.5">
            {p.tags.map((t) => (
              <TagLink key={t} tag={t} className="text-[12px] px-2.5 py-0.5 rounded-full transition-opacity hover:opacity-75" style={{ background: "var(--accent-soft)", color: "var(--accent-secondary)" }} />
            ))}
          </div>

          {linkedEvent && (
            <button
              type="button"
              onClick={() => onOpenEvent(linkedEvent.id)}
              className="w-full cursor-pointer rounded-2xl border p-4 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.35)] motion-reduce:transform-none"
              style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3.5">
                <FallbackImage
                  src={linkedEvent.thumb}
                  alt={`${linkedEvent.title} 행사 이미지`}
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em]"
                    style={{ color: "var(--accent-strong)" }}
                  >
                    <CalendarHeart size={12} aria-hidden style={{ color: "var(--accent)" }} />
                    연결된 행사
                  </div>
                  <div
                    className="mt-1 truncate text-[15px] leading-snug"
                    style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--heading)" }}
                  >
                    {linkedEvent.title}
                  </div>
                  {linkedEvent.runStart ? (
                    <div className="mt-0.5 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                      {linkedEvent.runStart}
                      {linkedEvent.runEnd && linkedEvent.runEnd !== linkedEvent.runStart
                        ? ` ~ ${linkedEvent.runEnd}`
                        : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div
                className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                  일정과 신청 안내를 확인해 주세요.
                </span>
                <span className="text-[13px] font-medium" style={{ color: "var(--heading)" }}>
                  행사 자세히 보기 →
                </span>
              </div>
            </button>
          )}

          <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            {officialNotice ? null : (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onLike}
                disabled={liking || refreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] disabled:opacity-50"
                style={{
                  background: liked ? "var(--danger-soft)" : "var(--border)",
                  color: liked ? "var(--danger)" : "var(--foreground)",
                }}
              >
                <IconPop active={liked}>
                  <Heart size={14} fill={liked ? "var(--danger)" : "transparent"} />
                </IconPop>{" "}
                {likes}
              </motion.button>
            )}
            <button
              type="button"
              onClick={onScrollToComments}
              aria-label="댓글 보기"
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px]"
              style={{ background: "var(--border)", color: "var(--foreground)" }}
            >
              <MessageCircle size={14} /> {commentCount}
            </button>
            <ShareButton
              title={p.text.slice(0, 80)}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px]"
              style={{ background: "var(--border)", color: "var(--foreground)" }}
            />
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onBookmark}
              disabled={bookmarking || refreshing}
              aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
              className="ml-auto w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-50"
              style={{
                background: bookmarked ? "var(--accent)" : "var(--border)",
                color: bookmarked ? "var(--surface-dark)" : "var(--foreground)",
              }}
            >
              <Bookmark size={14} fill={bookmarked ? "var(--surface-dark)" : "transparent"} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
