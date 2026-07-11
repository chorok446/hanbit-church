"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { KeyRound, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { apiPost, ApiError } from "@/lib/api";

type SetupResponse = { secret: string; otpauthUrl: string };

/**
 * 2단계 인증(TOTP) 등록·해제 — 계정 탭 보안 섹션.
 * 켜기: setup(시크릿·QR) → 인증 앱 코드 확인(enable). 해제: 비밀번호 재확인(disable).
 */
export function TwoFactorSection({ initialEnabled }: { initialEnabled: boolean }) {
  // initialEnabled 는 프로필 로드 시점 값 — 이후 변화는 이 컴포넌트의 enable/disable 성공으로만 일어난다.
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!setup) return; // QR 초기화는 setSetup(null) 을 부르는 핸들러에서 함께 한다(effect 내 동기 setState 금지).
    let cancelled = false;
    QRCode.toDataURL(setup.otpauthUrl, { width: 176, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // QR 생성 실패해도 시크릿 수동 입력으로 등록 가능하다.
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setup]);

  const startSetup = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setSetup(await apiPost<SetupResponse>("/api/auth/2fa/setup", {}));
      setCode("");
    } catch {
      toast.error("2단계 인증 등록을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (busy || code.trim().length !== 6) return;
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/auth/2fa/enable", { code: code.trim() });
      setEnabled(true);
      setSetup(null);
      setQrDataUrl(null);
      setCode("");
      toast.success("2단계 인증이 켜졌습니다.");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 400
          ? "코드가 올바르지 않습니다. 인증 앱의 최신 코드를 다시 입력해주세요."
          : "활성화에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/auth/2fa/disable", { password });
      setEnabled(false);
      setDisabling(false);
      setPassword("");
      toast.success("2단계 인증이 해제되었습니다.");
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "비밀번호가 올바르지 않습니다."
          : "해제에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const controlStyle = { background: "var(--card)", border: "1px solid var(--border)", color: "var(--foreground)" };

  return (
    <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {enabled ? (
            <ShieldCheck size={16} aria-hidden style={{ color: "var(--accent-strong)" }} />
          ) : (
            <KeyRound size={16} aria-hidden style={{ color: "var(--foreground-muted)" }} />
          )}
          <div>
            <p className="text-[14.5px] font-semibold" style={{ color: "var(--heading)" }}>
              2단계 인증 {enabled ? "(사용 중)" : ""}
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--foreground-muted)" }}>
              로그인 시 인증 앱(Google Authenticator 등)의 6자리 코드를 추가로 확인합니다.
            </p>
          </div>
        </div>
        {enabled ? (
          <button
            type="button"
            onClick={() => {
              setDisabling((v) => !v);
              setError("");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px]"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          >
            <ShieldOff size={13} aria-hidden /> 해제
          </button>
        ) : setup ? null : (
          <button
            type="button"
            onClick={() => void startSetup()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] disabled:opacity-50"
            style={{ borderColor: "var(--cta-bg)", color: "var(--cta-fg)", background: "var(--cta-bg)" }}
          >
            {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <ShieldCheck size={13} aria-hidden />}
            2단계 인증 켜기
          </button>
        )}
      </div>

      {setup ? (
        <div className="mt-5 space-y-4 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          <p className="text-[13.5px] leading-6" style={{ color: "var(--foreground)" }}>
            1) 인증 앱에서 아래 QR 코드를 스캔하거나 시크릿 키를 직접 입력하세요.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- 로컬 생성 data URL
              <img src={qrDataUrl} alt="2단계 인증 등록 QR 코드" width={176} height={176} className="rounded-lg" />
            ) : null}
            <div className="min-w-0">
              <p className="text-[12px]" style={{ color: "var(--foreground-muted)" }}>
                시크릿 키 (수동 입력용)
              </p>
              <code data-testid="totp-secret" className="mt-1 block break-all text-[13px]" style={{ color: "var(--heading)" }}>
                {setup.secret}
              </code>
            </div>
          </div>
          <p className="text-[13.5px] leading-6" style={{ color: "var(--foreground)" }}>
            2) 앱에 표시된 6자리 코드를 입력해 활성화를 완료하세요.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="123456"
              aria-label="인증 앱 6자리 코드"
              className="ui-control w-36 text-center tracking-[0.3em] placeholder:opacity-40"
              style={controlStyle}
            />
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy || code.length !== 6}
              className="rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-40"
              style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
            >
              활성화
            </button>
            <button
              type="button"
              onClick={() => {
                setSetup(null);
                setQrDataUrl(null);
                setError("");
              }}
              className="rounded-full border px-4 py-2.5 text-[13px]"
              style={{ borderColor: "var(--border)", color: "var(--foreground-muted)" }}
            >
              취소
            </button>
          </div>
        </div>
      ) : null}

      {enabled && disabling ? (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 확인"
            aria-label="2단계 인증 해제용 비밀번호"
            className="ui-control min-w-0 flex-1 placeholder:opacity-50"
            style={controlStyle}
          />
          <button
            type="button"
            onClick={() => void disable()}
            disabled={busy || !password}
            className="rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-40"
            style={{ background: "var(--danger-solid)", color: "var(--on-danger)" }}
          >
            해제 확정
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-[12.5px]" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
