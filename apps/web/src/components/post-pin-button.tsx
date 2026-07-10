"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pin, PinOff, Loader2 } from "lucide-react";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { setPostPinned, type Post } from "@/data/posts";

/** 공지·주보 스태프 권한 — 백엔드 requireAdminForOfficialCategory 와 동일 집합. */
const STAFF_ROLES = new Set(["ADMIN", "OPERATOR", "CONTENT"]);

/**
 * 공지·주보 상단 고정 토글. 스태프에게만 보이고 다른 카테고리에선 렌더하지 않는다.
 * 서버가 권한·카테고리를 다시 검증하므로 이 노출 조건은 UX 용이다.
 */
export function PostPinButton({ post, onUpdated }: { post: Post; onUpdated?: (post: Post) => void }) {
  const { profile } = useCurrentUserProfile();
  const [busy, setBusy] = useState(false);
  const [pinned, setPinned] = useState(post.pinned ?? false);

  if (post.category !== "NOTICE" && post.category !== "BULLETIN") return null;
  if (!profile?.role || !STAFF_ROLES.has(profile.role)) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await setPostPinned(post.id, !pinned);
      setPinned(updated.pinned ?? false);
      onUpdated?.(updated);
      toast.success(updated.pinned ? "목록 상단에 고정했습니다." : "고정을 해제했습니다.");
    } catch {
      toast.error("고정 설정에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] disabled:opacity-50"
      style={{ borderColor: "var(--border)", color: pinned ? "var(--accent-strong)" : "var(--foreground)" }}
    >
      {busy ? (
        <Loader2 size={13} className="animate-spin" aria-hidden />
      ) : pinned ? (
        <PinOff size={13} aria-hidden />
      ) : (
        <Pin size={13} aria-hidden />
      )}
      {pinned ? "고정 해제" : "상단 고정"}
    </button>
  );
}
