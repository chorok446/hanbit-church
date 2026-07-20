"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, MessageCircle, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import { clearSession, getSessionId } from "@/lib/auth";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { AuthorHeader } from "@/components/author-header";
import { IconPop } from "@/components/icon-pop";
import { PostPreview } from "@/components/post-text";
import { isStaffRole } from "@/app/admin/permissions";
import { markPostAnswered, postTimeLabel, prayPost, unprayPost, type Post } from "@/data/posts";

/**
 * 기도벽 카드. 좋아요와 결이 다른 기도 전용 반응('🙏 함께 기도했어요' 익명 카운터)과
 * 작성자·스태프의 '응답받았어요' 마킹을 담는다. 목록·상세 어디서 와도 post prop 이 바뀌면
 * 로컬 상태를 다시 맞춘다(FeedPostCard 동기화 패턴). identity(로그인 세션)가 바뀌면 내 반응 여부는 초기화.
 */
export function PrayerCard({
  p,
  refreshing,
  identity,
}: {
  p: Post;
  refreshing: boolean;
  identity: string | null;
}) {
  const router = useRouter();
  const { profile } = useCurrentUserProfile();
  const [prayedCount, setPrayedCount] = useState(p.prayedCount ?? 0);
  const [prayed, setPrayed] = useState(p.prayedByMe ?? false);
  const [praying, setPraying] = useState(false);
  const [answered, setAnswered] = useState(p.answered ?? false);
  const [answering, setAnswering] = useState(false);
  const [synced, setSynced] = useState({ post: p, identity });
  if (synced.post !== p || synced.identity !== identity) {
    const identityChanged = synced.identity !== identity;
    setSynced({ post: p, identity });
    setPrayedCount(p.prayedCount ?? 0);
    setAnswered(p.answered ?? false);
    setPrayed(identityChanged ? false : (p.prayedByMe ?? false));
  }

  // 작성자 본인 또는 스태프만 '응답받았어요'를 토글할 수 있다(서버가 다시 검증 — 이 노출은 UX 용).
  const canMarkAnswered = p.ownedByMe || isStaffRole(profile?.role);

  const promptLogin = (message: string, expired = false) => {
    if (expired) clearSession();
    toast.error(message);
    router.push("/login");
  };

  const onPray = async () => {
    if (!getSessionId()) return promptLogin("로그인 후 함께 기도할 수 있어요.");
    if (praying || refreshing) return;
    setPraying(true);
    const requestToken = getSessionId();
    try {
      const updated = prayed ? await unprayPost(p.id) : await prayPost(p.id);
      if (getSessionId() !== requestToken) return;
      setPrayedCount(updated.prayedCount ?? 0);
      setPrayed(updated.prayedByMe ?? false);
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) promptLogin("로그인 후 함께 기도할 수 있어요.", true);
      else toast.error("기도 반응 처리에 실패했습니다.");
    } finally {
      setPraying(false);
    }
  };

  const onToggleAnswered = async () => {
    if (answering || refreshing) return;
    setAnswering(true);
    const requestToken = getSessionId();
    try {
      const updated = await markPostAnswered(p.id, !answered);
      if (getSessionId() !== requestToken) return;
      setAnswered(updated.answered ?? false);
      toast.success(updated.answered ? "응답받은 기도로 표시했어요. 🙌" : "응답 표시를 해제했어요.");
    } catch (e) {
      if (getSessionId() !== requestToken) return;
      if (e instanceof ApiError && e.status === 401) promptLogin("로그인이 필요합니다.", true);
      else if (e instanceof ApiError && e.status === 403) toast.error("표시 권한이 없습니다.");
      else toast.error("응답 표시 처리에 실패했습니다.");
    } finally {
      setAnswering(false);
    }
  };

  const open = () => router.push(`/posts/${p.id}`);

  return (
    <article
      className="card-lift rounded-2xl border p-5 shadow-[0_18px_44px_-30px_rgba(0,0,0,0.4)]"
      style={{
        background: "var(--card)",
        // 응답받은 기도는 골드 라인 한 줄로 은은하게 구분(큰 면 금지 — 모던 클래식 토큰).
        borderColor: answered ? "var(--accent)" : "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <AuthorHeader
          className="flex-1"
          name={p.author.name}
          verified={p.author.verified}
          profileImageUrl={p.author.profileImageUrl}
          authorId={p.authorId}
          time={postTimeLabel(p)}
          timeClassName="text-[11px] opacity-60"
        />
        {p.visibility === "MEMBERS" ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
            title="교인만 공개"
          >
            교인만
          </span>
        ) : null}
      </div>

      {answered ? (
        <div
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
          style={{ background: "var(--accent-soft)", color: "var(--accent-strong)" }}
        >
          <Sparkles size={13} aria-hidden /> 응답받았어요
        </div>
      ) : null}

      <button
        type="button"
        onClick={open}
        className="mt-3 block w-full text-left"
        aria-label="기도제목 상세 보기"
      >
        <PostPreview
          text={p.text}
          className="line-clamp-4"
          style={{ color: "var(--foreground)", fontSize: 15, lineHeight: 1.7 }}
          maxLength={400}
        />
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4 text-[13px]" style={{ color: "var(--foreground-muted)" }}>
          <button
            type="button"
            onClick={onPray}
            disabled={praying || refreshing}
            aria-pressed={prayed}
            className="flex items-center gap-1.5 transition-[color,transform] active:scale-[0.9] motion-reduce:active:scale-100 disabled:opacity-50"
            style={prayed ? { color: "var(--accent-strong)" } : undefined}
          >
            <IconPop active={prayed}>
              <HeartHandshake size={16} fill={prayed ? "var(--accent)" : "none"} />
            </IconPop>
            <span>함께 기도 {prayedCount}</span>
          </button>
          <button type="button" onClick={open} className="flex items-center gap-1.5" aria-label="댓글 보기">
            <MessageCircle size={15} /> {p.comments}
          </button>
        </div>

        {canMarkAnswered ? (
          <button
            type="button"
            onClick={onToggleAnswered}
            disabled={answering || refreshing}
            className="rounded-full border px-3 py-1.5 text-[12px] font-medium disabled:opacity-50"
            style={
              answered
                ? { borderColor: "var(--accent)", color: "var(--accent-strong)" }
                : { borderColor: "var(--border)", color: "var(--foreground-muted)" }
            }
          >
            {answered ? "응답 표시 해제" : "응답받았어요 ✓"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
