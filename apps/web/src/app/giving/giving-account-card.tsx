"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Landmark } from "lucide-react";
import { CHURCH, CHURCH_GIVING } from "@/data/church";

/** 헌금 계좌 카드. env 미설정이면 계좌 대신 사무실 문의 안내를 보여준다. 계좌번호는 복사 버튼 제공. */
export function GivingAccountCard() {
  const [copied, setCopied] = useState(false);
  // 리셋 타이머를 보관해 빠른 재복사 시 이전 타이머가 새 피드백을 조기 종료하지 못하게 한다.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);
  const hasAccount = CHURCH_GIVING.bank && CHURCH_GIVING.account;

  if (!hasAccount) {
    return (
      <div
        className="mt-4 rounded-2xl border px-5 py-4 text-[14px] leading-7"
        style={{ background: "var(--panel)", borderColor: "var(--border)", color: "var(--foreground-muted)" }}
      >
        온라인 헌금 계좌는 준비 중입니다. 계좌 안내는 교회 사무실({CHURCH.phone})로 문의해 주세요.
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${CHURCH_GIVING.bank} ${CHURCH_GIVING.account}`);
      // 접근성·재알림은 sonner toast 가 담당(role=status, 매번 새 알림) — location-actions 와 동일 패턴.
      toast.success("계좌번호가 복사되었습니다.");
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 미지원·차단 브라우저 — 사용자가 직접 드래그 복사하면 된다.
      toast.error("복사하지 못했습니다. 계좌번호를 직접 선택해 복사해주세요.");
    }
  };

  return (
    <div
      className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4"
      style={{ background: "var(--panel)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <Landmark size={18} aria-hidden style={{ color: "var(--accent-strong)" }} />
        <div>
          <p className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
            {CHURCH_GIVING.bank} {CHURCH_GIVING.account}
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
            예금주: {CHURCH_GIVING.holder || CHURCH.name}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition-colors active:scale-[0.98] motion-reduce:active:scale-100"
        // 복사 완료를 골드 강조색으로 확인시킨다. 상태(copied) 기반 색이라 테마 토큰 그대로 사용.
        style={{
          borderColor: copied ? "var(--accent-strong)" : "var(--border)",
          color: copied ? "var(--accent-strong)" : "var(--foreground)",
        }}
      >
        {/* 아이콘 교체를 즉시 스왑하지 않고 새 아이콘을 페이드로 materialize — 복사됐음을 명확히 각인(Jakub §5).
            key 로 상태 전환마다 리마운트해 .fade-in 이 재생된다. 모션 축소는 globals.css 가 즉시 전환시킨다. */}
        <span className="relative inline-flex h-[13px] w-[13px] items-center justify-center">
          <span key={copied ? "check" : "copy"} className="fade-in absolute inset-0 inline-flex items-center justify-center">
            {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
          </span>
        </span>
        <span>{copied ? "복사됨" : "계좌 복사"}</span>
      </button>
    </div>
  );
}
