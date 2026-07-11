"use client";

import { useCallback, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { PageShell } from "@/components/page-shell";
import {
  fetchPublicUser,
  blockUser,
  unblockUser,
  type PublicUser,
} from "@/data/users";
import { getSessionId } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { UserPostsGrid } from "./user-posts-grid";

export function UserProfileClient({ user: initialUser }: { user: PublicUser }) {
  const { sessionId } = useAuthSession();
  const { profile } = useCurrentUserProfile();
  const confirm = useConfirm();
  const [user, setUser] = useState(initialUser);
  const [blockPending, setBlockPending] = useState(false);
  const isSelf = profile?.id === user.id;
  const blockedByMe = user.blockedByMe === true;

  const toggleBlock = useCallback(async () => {
    if (!getSessionId()) {
      toast.error("로그인 후 차단할 수 있어요.");
      return;
    }
    if (blockedByMe) {
      setBlockPending(true);
      try {
        await unblockUser(user.id);
        setUser(await fetchPublicUser(user.id));
        toast.success("차단을 해제했어요.");
      } catch {
        toast.error("차단 해제에 실패했어요.");
      } finally {
        setBlockPending(false);
      }
      return;
    }
    const ok = await confirm({
      title: `${user.name}님을 차단할까요?`,
      message: "차단하면 이 사용자와의 상호작용이 제한됩니다.",
      confirmLabel: "차단",
      destructive: true,
    });
    if (!ok) return;
    setBlockPending(true);
    try {
      await blockUser(user.id);
      setUser(await fetchPublicUser(user.id));
      toast.success("차단했어요.");
    } catch {
      toast.error("차단에 실패했어요.");
    } finally {
      setBlockPending(false);
    }
  }, [blockedByMe, confirm, user.id, user.name]);

  return (
    <PageShell paddingClassName="relative min-h-screen overflow-hidden" orb="right">
      <div className="relative pb-20">
        <div className="mx-auto max-w-5xl px-6 pb-8 pt-28 sm:px-8 sm:pt-32">
          <div
            className="rounded-3xl border p-6 sm:p-8"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-full shadow-[0_25px_55px_-20px_rgba(0,0,0,0.45)]">
                <Avatar
                  name={user.name}
                  verified={user.verified}
                  size={96}
                  src={user.profileImageUrl ?? undefined}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="mb-2 text-[11px] tracking-[0.28em] uppercase"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  Profile
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    className="break-words"
                    style={{
                      fontFamily: "var(--font-display)", fontWeight: 600,
                      fontSize: "clamp(30px, 5vw, 40px)",
                      color: "var(--foreground)",
                    }}
                  >
                    {user.name}
                  </h1>
                  {user.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] text-[var(--accent)]">
                      <CheckCircle2 size={12} aria-hidden />
                      후기 작성자
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-[14px]" style={{ color: "var(--foreground-muted)" }}>
                  게시글 {user.postCount.toLocaleString("ko-KR")}개
                </p>
                {!isSelf && sessionId ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={blockPending}
                      onClick={() => void toggleBlock()}
                      className="rounded-full border px-5 py-2 text-[13px] font-medium disabled:opacity-50"
                      style={{
                        borderColor: blockedByMe ? "var(--border)" : "rgba(var(--danger-rgb), 0.35)",
                        color: blockedByMe ? "var(--foreground-muted)" : "var(--danger)",
                        background: "var(--card)",
                      }}
                    >
                      {blockedByMe ? "차단 해제" : "차단"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6 sm:px-8">
          <h2 className="mb-4 text-[18px] font-medium" style={{ color: "var(--foreground)" }}>
            작성한 게시글
          </h2>
          <UserPostsGrid userId={user.id} />
        </div>
      </div>
    </PageShell>
  );
}
