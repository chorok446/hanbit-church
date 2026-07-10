"use client";

import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { CHURCH, CHURCH_GIVING } from "@/data/church";

/** 헌금 계좌 카드. env 미설정이면 계좌 대신 사무실 문의 안내를 보여준다. 계좌번호는 복사 버튼 제공. */
export function GivingAccountCard() {
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 미지원 브라우저 — 사용자가 직접 드래그 복사하면 된다.
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
        className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px]"
        style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
      >
        {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
        {copied ? "복사됨" : "계좌 복사"}
      </button>
    </div>
  );
}
