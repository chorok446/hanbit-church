"use client";

import type { ReactNode } from "react";
import { BellRing, ShieldCheck } from "lucide-react";
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
  onEmailChanged,
}: {
  currentEmail: string;
  profileName: string;
  onEmailChanged: (email: string) => void;
}) {
  return (
    <div className="space-y-6">
      <ChangeEmailForm embedded currentEmail={currentEmail} onChanged={onEmailChanged} />
      <ChangePasswordForm embedded profileName={profileName} />
      <NotificationSettingsForm embedded />

      <section aria-label="준비 중인 보안 기능" className="space-y-3">
        {/* TODO(보안: 로그인 알림) — 새 기기 로그인 시 알림 발송 기능 백엔드 미구현, 도입 시 연결 */}
        <UpcomingSecurityRow
          icon={<BellRing size={16} />}
          title="로그인 알림 (준비 중)"
          description="새로운 기기에서 로그인하면 알려드려요. 곧 제공될 예정입니다."
        />
        {/* TODO(보안: 2단계 인증) — TOTP/OTP 2FA 백엔드 미구현, 도입 시 연결 */}
        <UpcomingSecurityRow
          icon={<ShieldCheck size={16} />}
          title="2단계 인증 (준비 중)"
          description="비밀번호 외 추가 인증으로 계정을 보호해요. 곧 제공될 예정입니다."
        />
      </section>

      {/* 위험 영역 구분선 — 아래는 되돌릴 수 없는 동작(계정 탈퇴, 기존 기능 연결) */}
      <hr className="border-0" style={{ height: 1, background: "var(--danger)", opacity: 0.35 }} />
      <DeleteAccountForm embedded />
    </div>
  );
}
