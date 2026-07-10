"use client";

import type { ReactNode } from "react";
import { TwoFactorSection } from "./two-factor-section";
import { BellRing } from "lucide-react";
import { ChangeEmailForm } from "./change-email-form";
import { ChangePasswordForm } from "./change-password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { NotificationSettingsForm } from "./notification-settings-form";

/**
 * 준비 중인 보안 기능 안내 행. 동작하지 않는 기능은 반드시 disabled로 명시해
 * 동작하는 것처럼 보이지 않게 한다.
 */
function UpcomingSecurityRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border)", background: "var(--card)" }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          aria-hidden
        >
          {icon}
        </span>
        <span>
          <span className="block text-[14px] font-medium" style={{ color: "var(--foreground)" }}>
            {title}
          </span>
          <span className="block text-[12px]" style={{ color: "var(--foreground-muted)" }}>
            {description}
          </span>
        </span>
      </div>
      <button
        type="button"
        disabled
        className="shrink-0 cursor-not-allowed rounded-full border px-4 py-2 text-[12px] opacity-50"
        style={{ borderColor: "var(--border)", color: "var(--foreground-muted)", background: "transparent" }}
      >
        준비 중
      </button>
    </div>
  );
}

export function MypageAccountPanel({
  currentEmail,
  profileName,
  twoFactorEnabled = false,
  onEmailChanged,
}: {
  currentEmail: string;
  profileName: string;
  twoFactorEnabled?: boolean;
  onEmailChanged: (email: string) => void;
}) {
  return (
    <div className="space-y-6">
      <ChangeEmailForm embedded currentEmail={currentEmail} onChanged={onEmailChanged} />
      <ChangePasswordForm embedded profileName={profileName} />
      <NotificationSettingsForm embedded />

      <section aria-label="보안 기능" className="space-y-3">
        {/* 새 기기 로그인 알림 — 접속 기록에 없는 (IP, 브라우저) 조합 로그인 시 자동 발송(AccessLogService). */}
        <UpcomingSecurityRow
          icon={<BellRing size={16} />}
          title="로그인 알림"
          description="접속 기록에 없는 새 기기·브라우저에서 로그인하면 알림을 보내드려요. 별도 설정 없이 항상 켜져 있습니다."
        />
        <TwoFactorSection initialEnabled={twoFactorEnabled} />
      </section>

      {/* 위험 영역 구분선 — 아래는 되돌릴 수 없는 동작(계정 탈퇴, 기존 기능 연결) */}
      <hr className="border-0" style={{ height: 1, background: "var(--danger)", opacity: 0.35 }} />
      <DeleteAccountForm embedded />
    </div>
  );
}
