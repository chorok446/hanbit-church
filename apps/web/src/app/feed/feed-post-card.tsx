"use client";

import { toast } from "sonner";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { apiGet, apiPost, apiDelete, ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
import { Avatar } from "@/components/avatar";
import { AuthorHeader } from "@/components/author-header";
import { FallbackImage } from "@/components/fallback-image";
import { PostPreview } from "@/components/post-text";
import { ShareButton } from "@/components/share-button";
import { TagLink } from "@/components/tag-link";
import { isAdminOnlyCategory, postCategoryBadge, type Post, type PostComment } from "@/data/posts";

const MAX_COMMENT_LENGTH = 500;

/**
 * 이미지가 없는 글의 갤러리 placeholder 문구 — sermon-thumb 의 네이비(--banner-bg)+골드 관례를 따른다.
 * --banner-bg 는 양 테마 모두 네이비라 크림(var(--on-banner)) 텍스트를 그대로 쓴다.
 */
const GALLERY_PLACEHOLDERS: Record<string, { emoji: string; label: string }> = {
  SHARING: { emoji: "🌱", label: "함께 나누는 이야기" },
  PRAYER: { emoji: "🙏", label: "함께 기도해주세요" },
};

function GalleryPlaceholder({ category }: { category: string }) {
  const meta = GALLERY_PLACEHOLDERS[category] ?? GALLERY_PLACEHOLDERS.SHARING;
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2"
      style={{ background: "var(--banner-bg)" }}
      aria-hidden
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>{meta.emoji}</span>
      <span
        className="text-[13px] tracking-[0.14em] text-[var(--on-banner)]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        {meta.label}
      </span>
      <span className="h-px w-8" style={{ background: "var(--accent)" }} />
    </div>
  );
}

export function FeedPostCard({
  p,
  refreshing,
  identity,
  onOpen,
}: {
  p: Post;
  refreshing: boolean;
  identity: string | null;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 220, damping: 22 });
  const sy = useSpring(my, { stiffness: 220, damping: 22 });
  const rY = useTransform(sx, [-0.5, 0.5], [-6, 6]);
  const rX = useTransform(sy, [-0.5, 0.5], [5, -5]);

  const router = useRouter();
  const { sessionId: token } = useAuthSession();
  const [likes, setLikes] = useState(p.likes);
  const [liked, setLiked] = useState(p.likedByMe);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(p.bookmarkedByMe);
  const [bookmarking, setBookmarking] = useState(false);
  const [commentCount, setCommentCount] = useState(p.comments);
  const [synced, setSynced] = useState({ post: p, identity });
  if (synced.post !== p || synced.identity !== identity) {
    const identityChanged = synced.identity !== identity;
    setSynced({ post: p, identity });
    setLikes(p.likes);
    setCommentCount(p.comments);
    setLiked(identityChanged ? false : p.likedByMe);
    setBookmarked(identityChanged ? false : p.bookmarkedByMe);
  }
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const promptLogin = (message: string, expired = false) => {
    if (expired) clearSession();
    toast.error(message);
    router.push("/login");
  };

  const onLike = async () => {
    if (!getSessionId()) return promptLogin("로그인 후 이용할 수 있어요.");
    if (liking || refreshing) return;
    setLiking(true);
    const requestToken = getSessionId();
    try {
      const updated = liked
        ? await apiDelete<Post>(`/api/posts/${p.id}/like`)
        : await apiPost<Post>(`/api/posts/${p.id}/like`, {});
      if (getSessionId() !== requestToken) return;
      setLikes(updated.likes);
      setLiked(updated.likedByMe);
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) promptLogin("로그인 후 이용할 수 있어요.", true);
      else toast.error("좋아요 처리에 실패했습니다.");
    } finally {
      setLiking(false);
    }
  };

  const onBookmark = async () => {
    const requestToken = getSessionId();
    if (!requestToken) return promptLogin("로그인 후 이용할 수 있어요.");
    if (bookmarking || refreshing) return;
    setBookmarking(true);
    try {
      const updated = bookmarked
        ? await apiDelete<Post>(`/api/posts/${p.id}/bookmark`)
        : await apiPost<Post>(`/api/posts/${p.id}/bookmark`, {});
      if (getSessionId() !== requestToken) return;
      setBookmarked(updated.bookmarkedByMe);
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) promptLogin("로그인 후 이용할 수 있어요.", true);
      else toast.error("북마크 처리에 실패했습니다.");
    } finally {
      setBookmarking(false);
    }
  };

  const toggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      try {
        setComments(await apiGet<PostComment[]>(`/api/posts/${p.id}/comments`));
        setCommentsError("");
      } catch {
        setComments([]);
        setCommentsError("댓글을 불러오지 못했습니다.");
      } finally {
        setCommentsLoaded(true);
      }
    }
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text || busy) return;
    if (text.length > MAX_COMMENT_LENGTH) return toast.error(`댓글은 ${MAX_COMMENT_LENGTH}자 이하여야 합니다.`);
    if (!getSessionId()) return promptLogin("로그인해야 댓글을 작성할 수 있어요.");
    setBusy(true);
    try {
      const created = await apiPost<PostComment>(`/api/posts/${p.id}/comments`, { text });
      setComments((cs) => [...cs, created]);
      setCommentCount((c) => c + 1);
      setCommentText("");
    } catch (e) {
      setBusy(false);
      if (e instanceof ApiError && e.status === 401) promptLogin("로그인해야 댓글을 작성할 수 있어요.", true);
      else toast.error("댓글 작성에 실패했습니다.");
      return;
    }
    setBusy(false);
  };

  return (
    <div style={{ perspective: 1200 }}>
      <motion.article
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
        className="rounded-2xl border overflow-hidden shadow-[0_20px_50px_-25px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center gap-3 p-4">
          <AuthorHeader
            className="flex-1"
            name={p.author.name}
            verified={p.author.verified}
            profileImageUrl={p.author.profileImageUrl}
            authorId={p.authorId}
            time={p.time}
            timeClassName="text-[11px] opacity-60"
          />
          {(() => {
            const badge = postCategoryBadge(p.category);
            return (
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
              >
                <span aria-hidden>{badge.emoji}</span> {badge.label}
              </span>
            );
          })()}
        </div>

        {p.images.length === 0 ? (
          <button type="button" className="block aspect-[4/3] w-full overflow-hidden" onClick={onOpen} aria-label="게시글 상세 보기">
            <GalleryPlaceholder category={p.category} />
          </button>
        ) : p.images.length === 1 ? (
          <button type="button" className="block aspect-[4/3] w-full overflow-hidden" onClick={onOpen} aria-label="게시글 상세 보기">
            <FallbackImage src={p.images[0]} alt="" decorative thumbnail className="w-full h-full object-cover" />
          </button>
        ) : (
          <button type="button" className="grid aspect-[4/3] w-full grid-cols-2 gap-0.5 overflow-hidden" onClick={onOpen} aria-label="게시글 상세 보기">
            {p.images.map((src, i) => (
              <FallbackImage key={i} src={src} alt="" decorative thumbnail className="w-full h-full object-cover" />
            ))}
          </button>
        )}

        <div className="p-4 space-y-3">
          <PostPreview text={p.text} className="line-clamp-2" style={{ color: "var(--foreground)", fontSize: 14, lineHeight: 1.6 }} maxLength={320} />
          {p.tags.length > 0 || p.eventId ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {/* 연결 행사 배지 — PostBoardList(리스트 뷰)와 동일한 pill 스타일 */}
              {p.eventId ? (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
                >
                  <span aria-hidden>🗓</span> 행사 연결
                </span>
              ) : null}
              {p.tags.slice(0, 3).map((t) => (
                <TagLink key={t} tag={t} className="text-[11px] px-2 py-0.5 rounded-full transition-opacity hover:opacity-75" style={{ background: "var(--accent-soft)", color: "var(--accent-secondary)" }} />
              ))}
            </div>
          ) : null}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
            <div className="flex flex-wrap gap-3 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
              {/* 교회 공식 소식(공지·주보)에는 좋아요를 노출하지 않는다 */}
              {isAdminOnlyCategory(p.category) ? null : (
                <motion.button whileTap={{ scale: 0.85 }} onClick={onLike} disabled={liking || refreshing} className="flex items-center gap-1 hover:text-[var(--danger)] transition-colors disabled:opacity-50" style={liked ? { color: "var(--danger)" } : undefined}>
                  <Heart size={14} fill={liked ? "var(--danger)" : "none"} /> {likes}
                </motion.button>
              )}
              <button onClick={toggleComments} className="flex items-center gap-1">
                <MessageCircle size={14} /> {commentCount}
              </button>
              <ShareButton
                title={p.text.slice(0, 80)}
                className="flex items-center gap-1 hover:text-[var(--danger)] transition-colors"
              />
              {/* 신고는 카드에 직접 노출하지 않는다 — 상세 페이지의 ⋯ 메뉴(PostActionsMenu)로 충분. */}
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onBookmark}
              disabled={bookmarking || refreshing}
              aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
              className="transition-colors disabled:opacity-50"
              style={{ color: bookmarked ? "var(--accent)" : "var(--foreground-muted)" }}
            >
              <Bookmark size={14} fill={bookmarked ? "var(--accent)" : "transparent"} />
            </motion.button>
          </div>

          {showComments && (
            <div className="pt-3 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
              {commentsError ? (
                <p className="text-[12px]" style={{ color: "var(--danger)" }}>{commentsError}</p>
              ) : comments.length === 0 ? (
                <p className="text-[12px] opacity-50" style={{ color: "var(--foreground)" }}>
                  {commentsLoaded ? "첫 댓글을 남겨보세요." : "댓글을 불러오는 중…"}
                </p>
              ) : (
                comments.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex gap-2 items-start">
                    <Avatar
                      name={c.author.name}
                      verified={c.author.verified}
                      size={32}
                      src={c.author.profileImageUrl ?? undefined}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px]" style={{ color: "var(--foreground)" }}>
                        {c.author.name} <span className="opacity-50">· {c.time}</span>
                      </div>
                      <p className="text-[13px]" style={{ color: "var(--border)" }}>{c.text}</p>
                    </div>
                  </div>
                ))
              )}
              {token ? (
                <div className="flex items-center gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitComment())}
                    placeholder="댓글 달기…"
                    aria-label="댓글 내용"
                    maxLength={MAX_COMMENT_LENGTH}
                    className="flex-1 bg-transparent outline-none text-[13px] px-3 py-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    style={{ background: "var(--border)", color: "var(--foreground)" }}
                  />
                  <button
                    onClick={submitComment}
                    disabled={busy || !commentText.trim()}
                    aria-label="댓글 등록"
                    className="p-2 rounded-full disabled:opacity-40"
                    style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
                  >
                    <Send size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center" style={{ background: "var(--border)" }}>
                  <p className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                    댓글을 작성하려면 로그인이 필요합니다.
                  </p>
                  <button type="button" onClick={() => router.push("/login")} className="rounded-full bg-[var(--cta-bg)] px-4 py-1.5 text-[12px] text-[var(--cta-fg)]">
                    로그인하기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.article>
    </div>
  );
}
