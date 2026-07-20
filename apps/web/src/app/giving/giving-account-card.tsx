"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Landmark, QrCode, Send } from "lucide-react";
import { CHURCH, CHURCH_GIVING } from "@/data/church";

// 이체 메모용 헌금 종류 프리셋(짧은 표기 — 은행 앱 메모칸에 맞춤). 종류 명칭은 교회 관례 따라 조정.
const MEMO_KINDS = ["십일조", "감사", "주정", "건축", "선교", "절기"] as const;

/** 헌금 계좌 카드. env 미설정이면 계좌 대신 사무실 문의 안내를 보여준다.
 *  계좌 복사·QR·간편송금 딥링크·이체 메모(성도명+종류) 복사를 제공한다. */
export function GivingAccountCard() {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>(MEMO_KINDS[0]);
  // 리셋 타이머를 보관해 빠른 재복사 시 이전 타이머가 새 피드백을 조기 종료하지 못하게 한다.
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const hasAccount = CHURCH_GIVING.bank && CHURCH_GIVING.account;
  const accountLine = `${CHURCH_GIVING.bank} ${CHURCH_GIVING.account}`;
  const holder = CHURCH_GIVING.holder || CHURCH.name;

  // QR: 계좌이체용 텍스트(은행/계좌/예금주)를 인코딩. qrcode(~50KB)는 동적 로드해 다른 페이지 번들에 안 실린다.
  useEffect(() => {
    if (!hasAccount) return;
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(`${accountLine} ${holder}`, { width: 160, margin: 1 }))
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => { if (!cancelled) setQr(null); }); // QR 실패해도 계좌·복사 기능은 그대로 동작.
    return () => { cancelled = true; };
  }, [hasAccount, accountLine, holder]);

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

  // 공통 클립보드 복사. 실패(미지원·권한 차단) 시 직접 선택 복사를 안내한다.
  const copyText = async (text: string, ok: string, onOk?: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(ok); // 접근성·재알림은 sonner toast(role=status)가 담당 — location-actions 와 동일 패턴.
      onOk?.();
    } catch {
      toast.error("복사하지 못했습니다. 내용을 직접 선택해 복사해주세요.");
    }
  };

  const copyAccount = () =>
    copyText(accountLine, "계좌번호가 복사되었습니다.", () => {
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    });

  const memo = [name.trim(), kind].filter(Boolean).join(" ");
  const copyMemo = () => copyText(memo, `이체 메모 “${memo}” 이(가) 복사되었습니다.`);

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* 계좌 + 복사 + QR */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-3">
          <Landmark size={18} aria-hidden style={{ color: "var(--accent-strong)" }} />
          <div>
            <p className="text-[15px] font-semibold" style={{ color: "var(--heading)" }}>
              {accountLine}
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
              예금주: {holder}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copyAccount()}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition-colors active:scale-[0.98] motion-reduce:active:scale-100"
          // 복사 완료를 골드 강조색으로 확인시킨다. 상태(copied) 기반 색이라 테마 토큰 그대로 사용.
          style={{
            borderColor: copied ? "var(--accent-strong)" : "var(--border)",
            color: copied ? "var(--accent-strong)" : "var(--foreground)",
          }}
        >
          {/* 아이콘을 즉시 스왑하지 않고 페이드로 materialize — 복사됐음을 명확히 각인(Jakub §5). */}
          <span className="relative inline-flex h-[13px] w-[13px] items-center justify-center">
            <span key={copied ? "check" : "copy"} className="fade-in absolute inset-0 inline-flex items-center justify-center">
              {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
            </span>
          </span>
          <span>{copied ? "복사됨" : "계좌 복사"}</span>
        </button>

        {qr && (
          <div className="flex w-full items-center gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, next/image 최적화 불필요 */}
            <img
              src={qr}
              alt={`${accountLine} 계좌이체 QR 코드`}
              width={80}
              height={80}
              className="rounded-lg bg-white p-1"
            />
            <p className="flex items-center gap-1.5 text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
              <QrCode size={14} aria-hidden style={{ color: "var(--accent-strong)" }} />
              카메라로 스캔하면 은행·계좌·예금주가 표시됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 간편송금 딥링크 — env 미설정이면 버튼 자체를 렌더하지 않는다(graceful). */}
      {(CHURCH_GIVING.kakaopay || CHURCH_GIVING.toss) && (
        <div className="flex flex-wrap gap-2">
          {CHURCH_GIVING.kakaopay && (
            <a
              href={CHURCH_GIVING.kakaopay}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98] motion-reduce:active:scale-100"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              <Send size={13} aria-hidden />
              카카오페이 송금
            </a>
          )}
          {CHURCH_GIVING.toss && (
            <a
              href={CHURCH_GIVING.toss}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold transition-transform active:scale-[0.98] motion-reduce:active:scale-100"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              <Send size={13} aria-hidden />
              토스 송금
            </a>
          )}
        </div>
      )}

      {/* 이체 메모 프리셋 — 성도명 + 헌금 종류를 골라 "이름 종류" 형식으로 복사한다. */}
      <div
        className="rounded-2xl border px-5 py-4"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <label htmlFor="giving-name" className="text-[13px] font-semibold" style={{ color: "var(--heading)" }}>
          이체 메모 만들기
        </label>
        <p className="mt-1 text-[12.5px] leading-5" style={{ color: "var(--foreground-muted)" }}>
          성도명과 헌금 종류를 고르면 이체 시 적을 메모를 복사할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id="giving-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="성도명 (예: 홍길동)"
            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-[14px] outline-none"
            style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="헌금 종류">
          {MEMO_KINDS.map((k) => {
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                onClick={() => setKind(k)}
                className="rounded-full border px-3 py-1.5 text-[12.5px] transition-colors"
                style={{
                  borderColor: active ? "var(--accent-strong)" : "var(--border)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent-strong)" : "var(--foreground-muted)",
                }}
              >
                {k}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
            메모: <b style={{ color: "var(--foreground)" }}>{memo || "종류를 선택하세요"}</b>
          </span>
          <button
            type="button"
            onClick={() => void copyMemo()}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] transition-colors active:scale-[0.98] motion-reduce:active:scale-100"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
          >
            <Copy size={13} aria-hidden />
            메모 복사
          </button>
        </div>
      </div>
    </div>
  );
}
