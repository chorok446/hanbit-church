"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useCurrentUserProfile } from "@/lib/use-current-user-profile";
import { notifyProfileUpdated } from "@/lib/auth";
import { updateProfile } from "@/data/users";

type PreferenceKey = "notifyEventUpdates" | "notifyComments" | "notifyLikes";

const PREFERENCES: { key: PreferenceKey; label: string; description: string }[] = [
  { key: "notifyEventUpdates", label: "행사 알림", description: "참여·북마크한 행사의 모집 상태·안내 변경, 마감 임박, 자리 알림" },
  { key: "notifyComments", label: "댓글 알림", description: "내 글의 댓글, 내 댓글의 답글, 멘션" },
  { key: "notifyLikes", label: "좋아요 알림", description: "내 글에 눌린 좋아요" },
];

export function NotificationSettingsForm({ embedded = false }: { embedded?: boolean }) {
  const { profile } = useCurrentUserProfile();
  const [saving, setSaving] = useState(false);

  const current = (key: PreferenceKey) => profile?.[key] ?? true;

  const toggle = async (key: PreferenceKey) => {
    if (!profile || saving) return;
    setSaving(true);
    try {
      // 요청 DTO 기본값이 true 라, 빠뜨린 설정은 저장 시 켜짐으로 초기화된다 — 전부 전달한다.
      await updateProfile({
        name: profile.name,
        profileImageUrl: profile.profileImageUrl ?? null,
        notifyEventUpdates: current("notifyEventUpdates"),
        notifyComments: current("notifyComments"),
        notifyLikes: current("notifyLikes"),
        [key]: !current(key),
      });
      notifyProfileUpdated();
    } catch {
      toast.error("알림 설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={embedded ? undefined : "mx-auto mb-6 max-w-5xl px-6 sm:px-8"}
      aria-labelledby="notification-settings-title"
    >
      <div
        className="rounded-3xl border p-5 sm:p-7"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
            <Bell size={19} aria-hidden="true" />
          </span>
          <div>
            <h2 id="notification-settings-title" className="text-[17px] font-semibold" style={{ color: "var(--foreground)" }}>
              알림 설정
            </h2>
            <p className="mt-0.5 text-[12px] opacity-60" style={{ color: "var(--foreground)" }}>
              유형별 알림 수신 여부를 설정합니다. 보안·운영 안내는 항상 전달됩니다.
            </p>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {PREFERENCES.map(({ key, label, description }) => {
            const enabled = current(key);
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <span id={`${key}-label`} className="block text-[13px]" style={{ color: "var(--foreground)" }}>
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] opacity-55" style={{ color: "var(--foreground)" }}>
                    {description}
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-labelledby={`${key}-label`}
                  aria-checked={enabled}
                  disabled={!profile || saving}
                  onClick={() => void toggle(key)}
                  className="h-5 w-10 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-40"
                  style={{
                    background: enabled ? "var(--accent)" : "rgba(var(--ink-rgb), 0.15)",
                  }}
                >
                  <motion.div
                    animate={{ x: enabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="h-4 w-4 rounded-full bg-white"
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
