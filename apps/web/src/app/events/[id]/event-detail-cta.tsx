"use client";

import { Loader2, LogIn, CheckCircle2 } from "lucide-react";
import { eventLifecycle, type Event } from "@/data/events";

const APPLY_GUIDE = "신청 후 담당자가 확인하여 안내드립니다.";

function ApplyGuide() {
  return (
    <p className="mt-2 text-center text-[12px]" style={{ color: "var(--foreground-muted)" }}>
      {APPLY_GUIDE}
    </p>
  );
}

export function EventCTABar({
  c,
  onJoin,
  onLeave,
  onLogin,
  action,
  disabled,
  loggedIn,
}: {
  c: Event;
  onJoin: () => void;
  onLeave: () => void;
  onLogin: () => void;
  action: "join" | "leave" | null;
  disabled: boolean;
  loggedIn: boolean;
}) {
  const panelStyle = {
    background: "var(--card)",
    borderColor: "var(--border)",
    color: "var(--foreground)",
  };
  const joinedStyle = { background: "var(--accent-soft)", color: "var(--accent-secondary)", fontSize: 16 };
  const pending = action !== null;
  const lifecycle = eventLifecycle(c);

  if (c.joinedByMe) {
    if (c.status === "open") {
      return (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-5 px-6 rounded-2xl text-center font-medium"
              style={joinedStyle}
            >
              <CheckCircle2 size={20} aria-hidden />
              <span>참여 완료 · 모집 중인 행사입니다</span>
            </div>
            <button
              type="button"
              onClick={onLeave}
              disabled={disabled || pending}
              aria-busy={action === "leave"}
              aria-label={action === "leave" ? "참여 취소 처리 중" : "참여 취소"}
              className="inline-flex items-center justify-center gap-2 py-5 px-6 rounded-2xl font-medium hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
            >
              {action === "leave" ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              {action === "leave" ? "취소 처리 중…" : "참여 취소"}
            </button>
          </div>
          <ApplyGuide />
        </div>
      );
    }
    const joinedMessage =
      lifecycle.phase === "ended"
        ? "참여 완료 · 종료된 행사입니다"
        : c.status === "closed"
          ? "참여 완료 · 모집이 마감된 행사입니다"
          : "참여 완료 · 종료된 행사입니다";
    return (
      <div
        role="status"
        className="flex items-center justify-center gap-2 w-full py-5 rounded-2xl text-center font-medium"
        style={joinedStyle}
      >
        <CheckCircle2 size={20} aria-hidden />
        <span>{joinedMessage}</span>
      </div>
    );
  }

  if (c.recruitable) {
    if (!loggedIn) {
      return (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-6 text-center"
          style={panelStyle}
        >
          <p className="text-[14px]" style={{ color: "var(--foreground-muted)" }}>
            로그인 후 행사에 참여할 수 있어요.
          </p>
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full cta-solid px-6 py-3 text-[14px] font-medium sm:w-auto"
          >
            <LogIn size={16} aria-hidden />
            로그인 후 참여하기
          </button>
          <p className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>{APPLY_GUIDE}</p>
        </div>
      );
    }
    return (
      <div>
        <button
          type="button"
          onClick={onJoin}
          disabled={disabled || pending}
          aria-busy={action === "join"}
          aria-label={action === "join" ? "행사 참여 처리 중" : "행사 참여하기"}
          className="cta-solid inline-flex w-full items-center justify-center gap-2 py-5 rounded-2xl font-medium hover:-translate-y-0.5 transition-transform shadow-[0_30px_60px_-20px_var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ fontSize: 17 }}
        >
          {action === "join" ? <Loader2 size={18} className="animate-spin" aria-hidden /> : null}
          {action === "join" ? "참여 처리 중…" : "행사 참여하기"}
        </button>
        <ApplyGuide />
      </div>
    );
  }

  // 참여 불가 상태 — 상태별 라벨을 disabled 버튼으로 노출한다(기준: eventLifecycle).
  const { label, description } =
    lifecycle.phase === "ended"
      ? { label: "종료된 행사입니다", description: "참여 후기 탭에서 함께한 이야기를 확인해보세요." }
      : lifecycle.phase === "before_recruit"
        ? { label: "모집 시작 전입니다", description: "모집이 시작되면 이곳에서 참여 신청을 할 수 있습니다." }
        : c.recruitState === "recruiting"
          ? { label: "정원이 마감되었습니다", description: "취소 인원이 생기면 다시 신청할 수 있습니다." }
          : { label: "모집이 마감되었습니다", description: "다음 행사·사역 소식을 기다려주세요." };

  return (
    <div className="w-full rounded-2xl border px-6 py-5 text-center" style={panelStyle}>
      <button
        type="button"
        disabled
        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl py-4 font-medium opacity-60"
        style={{ background: "rgba(var(--ink-rgb), 0.07)", color: "var(--foreground-muted)", fontSize: 16 }}
      >
        {label}
      </button>
      <p className="mt-2 text-[12px]" style={{ color: "var(--foreground-muted)" }}>{description}</p>
    </div>
  );
}
