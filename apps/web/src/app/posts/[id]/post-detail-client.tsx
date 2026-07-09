"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { apiPost, apiDelete, apiDeleteVoid, ApiError } from "@/lib/api";
import { getSessionId, clearSession } from "@/lib/auth";
import { useAuthedRefresh } from "@/lib/use-authed-refresh";
import { ReportButton, type ReportButtonHandle } from "@/components/report-button";
import { AdminModerationButton } from "@/components/admin-moderation-button";
import { PageShell } from "@/components/page-shell";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { isAdminOnlyCategory, type Post } from "@/data/posts";
import type { Campaign } from "@/data/campaigns";
import { PostDetailComments } from "./post-detail-comments";
import { PostDetailHero } from "./post-detail-hero";
import { SermonDetail } from "./sermon-detail";

/** 상세 우상단 ⋯ 메뉴 — 링크 복사와 신고(공지·주보 제외)를 담는다. */
function PostActionsMenu({ postId, canReport }: { postId: string; canReport: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<ReportButtonHandle>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const copyLink = async () => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(location.href);
      toast.success("링크를 복사했어요.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const menuItemClass =
    "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.05)]";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="게시글 메뉴"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[rgba(var(--ink-rgb),0.06)]"
        style={{ color: "var(--foreground-muted)" }}
      >
        <MoreHorizontal size={17} />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="게시글 메뉴"
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border py-1 shadow-xl"
          style={{ background: "var(--panel)", borderColor: "var(--border)" }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyLink()}
            className={menuItemClass}
            style={{ color: "var(--foreground)" }}
          >
            <Link2 size={13} aria-hidden /> 링크 복사
          </button>
          {canReport ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                reportRef.current?.open();
              }}
              className={menuItemClass}
              style={{ color: "var(--danger)" }}
            >
              <Flag size={13} aria-hidden /> 신고하기
            </button>
          ) : null}
        </div>
      ) : null}
      {canReport ? (
        <ReportButton ref={reportRef} hideTrigger targetType="POST" targetId={postId} ownedByMe={false} />
      ) : null}
    </div>
  );
}

export default function PostDetailClient({ post, linkedCampaign }: { post: Post; linkedCampaign: Campaign | null }) {
  const router = useRouter();
  const p = post;
  const [idx, setIdx] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [likes, setLikes] = useState(p.likes);
  const [liked, setLiked] = useState(p.likedByMe);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(p.bookmarkedByMe);
  const [bookmarking, setBookmarking] = useState(false);
  const [owned, setOwned] = useState(p.ownedByMe);
  const [deleting, setDeleting] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments);
  const commentSectionRef = useRef<HTMLDivElement>(null);
  const confirm = useConfirm();
  // 설교는 전용 레이아웃(영상 중심 + 말씀 요약·나눔 질문 섹션)으로 분기한다.
  const isSermon = p.category === "SERMON";

  const { refreshing, invalidatePending } = useAuthedRefresh<Post>(
    `/api/posts/${p.id}`,
    (u) => {
      setLikes(u.likes);
      setLiked(u.likedByMe);
      setBookmarked(u.bookmarkedByMe);
      setOwned(u.ownedByMe);
    },
    () => {
      setLiked(false);
      setBookmarked(false);
      setOwned(false);
    },
  );

  const onDelete = async () => {
    if (deleting) return;
    const requestToken = getSessionId();
    if (!requestToken) {
      toast.error("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    if (!(await confirm({ message: "이 게시글을 삭제할까요? 되돌릴 수 없습니다.", destructive: true, confirmLabel: "삭제" }))) return;
    setDeleting(true);
    try {
      await apiDeleteVoid(`/api/posts/${p.id}`);
      if (getSessionId() !== requestToken) return;
      router.push("/mypage");
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        toast.error("로그인이 필요합니다.");
        router.push("/login");
      } else if (e instanceof ApiError && e.status === 403) {
        toast.error("삭제 권한이 없습니다.");
      } else {
        toast.error("게시글 삭제에 실패했습니다.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const onLike = async () => {
    if (!getSessionId()) {
      toast.error("로그인 후 이용할 수 있어요.");
      router.push("/login");
      return;
    }
    if (liking || refreshing) return;
    setLiking(true);
    invalidatePending();
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
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        toast.error("로그인 후 이용할 수 있어요.");
        router.push("/login");
      } else {
        toast.error("좋아요 처리에 실패했습니다.");
      }
    } finally {
      setLiking(false);
    }
  };

  const onBookmark = async () => {
    const requestToken = getSessionId();
    if (!requestToken) {
      toast.error("로그인 후 이용할 수 있어요.");
      router.push("/login");
      return;
    }
    if (bookmarking || refreshing) return;
    setBookmarking(true);
    invalidatePending();
    try {
      const updated = bookmarked
        ? await apiDelete<Post>(`/api/posts/${p.id}/bookmark`)
        : await apiPost<Post>(`/api/posts/${p.id}/bookmark`, {});
      if (getSessionId() !== requestToken) return;
      setBookmarked(updated.bookmarkedByMe);
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        toast.error("로그인 후 이용할 수 있어요.");
        router.push("/login");
      } else {
        toast.error("북마크 처리에 실패했습니다.");
      }
    } finally {
      setBookmarking(false);
    }
  };

  return (
    <PageShell paddingClassName="relative min-h-screen pt-28 pb-20 px-6 overflow-hidden" orb="right">
      <div className="max-w-5xl mx-auto relative">
        <h1 className="sr-only">게시글 상세</h1>
        <div className="mb-6 flex items-center justify-between gap-3">
          {/* 카테고리에 맞는 목록으로 돌려보낸다 — 소식에서 온 공지·주보가 교제로 떨어지지 않게. */}
          {(() => {
            const back =
              p.category === "NOTICE" || p.category === "BULLETIN"
                ? { href: "/news", label: "소식으로 돌아가기" }
                : p.category === "SERMON"
                  ? { href: "/sermons", label: "설교로 돌아가기" }
                  : { href: "/feed", label: "교제로 돌아가기" };
            return (
              <button
                type="button"
                onClick={() => router.push(back.href)}
                className="inline-flex items-center gap-2 text-[13px] opacity-70 hover:opacity-100"
                style={{ color: "var(--foreground)" }}
              >
                <ArrowLeft size={14} /> {back.label}
              </button>
            );
          })()}

          {owned ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/posts/${p.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px]"
                style={{ background: "var(--border)", color: "var(--foreground)" }}
              >
                <Pencil size={13} /> 수정
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] disabled:opacity-50"
                style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
              >
                <Trash2 size={13} /> {deleting ? "삭제 중…" : "삭제"}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <AdminModerationButton targetType="POST" targetId={p.id} />
              {/* 교회 공식 소식(공지·주보)은 신고 대상이 아니다 — 메뉴에는 링크 복사만 남는다 */}
              <PostActionsMenu postId={p.id} canReport={!isAdminOnlyCategory(p.category)} />
            </div>
          )}
        </div>

        {isSermon ? (
          <SermonDetail
            post={p}
            bookmarked={bookmarked}
            bookmarking={bookmarking}
            refreshing={refreshing}
            onBookmark={() => void onBookmark()}
          />
        ) : (
        <PostDetailHero
          post={p}
          linkedCampaign={linkedCampaign}
          idx={idx}
          imageFailed={imageFailed}
          likes={likes}
          liked={liked}
          liking={liking}
          bookmarked={bookmarked}
          bookmarking={bookmarking}
          refreshing={refreshing}
          commentCount={commentCount}
          onImageError={() => setImageFailed(true)}
          onPrevImage={() => {
            setImageFailed(false);
            setIdx((i) => (i - 1 + p.images.length) % p.images.length);
          }}
          onNextImage={() => {
            setImageFailed(false);
            setIdx((i) => (i + 1) % p.images.length);
          }}
          onLike={() => void onLike()}
          onBookmark={() => void onBookmark()}
          onOpenCampaign={(id) => router.push(`/campaigns/${id}`)}
          onScrollToComments={() => commentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
        )}

        {/* 설교는 좋아요·댓글을 노출하지 않는다 — 댓글 섹션은 다른 카테고리에서만 렌더. */}
        {isSermon ? null : (
          <PostDetailComments
            postId={p.id}
            count={commentCount}
            onCountChange={setCommentCount}
            sectionRef={commentSectionRef}
          />
        )}
      </div>
    </PageShell>
  );
}
