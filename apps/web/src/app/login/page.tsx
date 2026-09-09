"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, FieldInput } from "@/components/auth-shell";
import { apiPost, ApiError, apiErrorMessage } from "@/lib/api";
import { REMEMBER_EMAIL_KEY, setSession } from "@/lib/auth";
import { isInternalHref } from "@/lib/internal-href";
import { CHURCH } from "@/data/church";

type AuthResponse = { token: string; name: string; verified: boolean; passwordChangeRequired?: boolean };
type LoginResponse = AuthResponse | { twoFactorRequired: true; challengeToken: string };

export default function LoginPage() {
  const router = useRouter();
  // 저장된 이메일 — hydration 중엔 서버 스냅샷(null)이라 SSR 과 첫 렌더가 일치하고,
  // 직후 재렌더에서 값이 반영된다(theme-toggle 과 같은 패턴, effect-setState 금지 규칙 준수).
  const savedEmail = useSyncExternalStore(
    () => () => {},
    () => localStorage.getItem(REMEMBER_EMAIL_KEY),
    () => null,
  );
  // 사용자가 입력을 시작하기 전까지는 저장값을 표시한다(null = 아직 미입력).
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const email = emailInput ?? savedEmail ?? "";
  const setEmail = (value: string) => setEmailInput(value);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rememberInput, setRememberInput] = useState<boolean | null>(null);
  const rememberEmail = rememberInput ?? savedEmail != null;
  const [showRecoveryHint, setShowRecoveryHint] = useState(false);
  // 2단계 인증 — 1단계 통과 후 challengeToken 을 들고 코드 입력 단계로 전환한다.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const finishLogin = (res: AuthResponse) => {
    // '이메일 기억하기' — 로그인 성공 시점에만 저장/삭제한다(실패한 시도는 기록하지 않음).
    if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    setSession(res.name);
    // 임시 비밀번호 로그인 — 바로 비밀번호 변경으로 안내한다(계정 탭 배너와 짝).
    if (res.passwordChangeRequired) {
      toast.info("임시 비밀번호로 로그인했습니다. 새 비밀번호로 변경해주세요.");
      router.push("/mypage?tab=account");
      return;
    }
    // 보호 페이지에서 넘어온 경우 복귀(open redirect 방지: 내부 경로만 허용).
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(isInternalHref(next) ? next : "/feed");
  };

  const submit = async () => {
    if (!email.trim() || !password || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost<LoginResponse>("/api/auth/login", { email, password });
      if ("twoFactorRequired" in res) {
        setChallengeToken(res.challengeToken);
        setOtpCode("");
        setSubmitting(false);
        return;
      }
      finishLogin(res);
    } catch (e) {
      setSubmitting(false);
      // 보안상 이메일 존재 여부는 드러내지 않음(401은 자격증명 오류로 통일).
      // 403은 정지 계정 — 서버가 내려준 안내(기간 포함)를 그대로 보여준다. 그 외는 일시적 오류 안내.
      setError(
        e instanceof ApiError && e.status === 401
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : e instanceof ApiError && e.status === 403
            ? apiErrorMessage(e, "이용이 정지된 계정입니다.")
            : "로그인에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  };

  const submitOtp = async () => {
    if (!challengeToken || otpCode.length !== 6 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost<AuthResponse>("/api/auth/2fa/verify", { challengeToken, code: otpCode });
      finishLogin(res);
    } catch (e) {
      setSubmitting(false);
      if (e instanceof ApiError && e.status === 401 && apiErrorMessage(e, "").includes("challenge")) {
        // 챌린지 만료(5분) — 처음부터 다시.
        setChallengeToken(null);
        setError("인증 시간이 만료되었습니다. 다시 로그인해주세요.");
        return;
      }
      setError("코드가 올바르지 않습니다. 인증 앱의 최신 코드를 입력해주세요.");
    }
  };

  return (
    <AuthShell
      subtitle="Welcome back"
      title="로그인"
      footer={
        <p className="text-center text-[14px] mt-6" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
          아직 회원이 아니신가요?{" "}
          <Link href="/signup" className="underline" style={{ color: "var(--accent-strong)" }}>
            회원가입
          </Link>
        </p>
      }
    >
      {challengeToken ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitOtp();
          }}
        >
          <p className="text-[14px] leading-6" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
            2단계 인증이 켜져 있는 계정입니다. 인증 앱(Google Authenticator 등)의 6자리 코드를 입력해주세요.
          </p>
          <FieldInput
            label="인증 코드"
            name="otp"
            autoComplete="one-time-code"
            icon={<Lock size={18} />}
            placeholder="123456"
            value={otpCode}
            onChange={(value) => setOtpCode(value.replace(/[^0-9]/g, "").slice(0, 6))}
            error={error}
          />
          <button
            type="submit"
            disabled={submitting || otpCode.length !== 6}
            className="cta-solid mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-55 motion-reduce:transform-none"
          >
            {submitting ? "확인 중…" : "인증하고 로그인"}
            {submitting ? (
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <ArrowRight size={16} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setError("");
            }}
            className="w-full text-center text-[13px] underline"
            style={{ color: "rgba(var(--ink-rgb), 0.72)" }}
          >
            처음부터 다시 로그인
          </button>
        </form>
      ) : (
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FieldInput label="이메일" name="email" autoComplete="email" icon={<Mail size={18} />} placeholder="이메일을 입력하세요" value={email} onChange={setEmail} />
        <FieldInput
          label="비밀번호"
          name="password"
          autoComplete="current-password"
          icon={<Lock size={18} />}
          type="password"
          placeholder="비밀번호를 입력하세요"
          value={password}
          onChange={setPassword}
          error={error}
        />

        <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberInput(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            이메일 기억하기
          </label>
          <button
            type="button"
            onClick={() => setShowRecoveryHint((v) => !v)}
            aria-expanded={showRecoveryHint}
            aria-controls="login-recovery-hint"
            className="underline-offset-4 hover:underline"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        {showRecoveryHint ? (
          <p id="login-recovery-hint" className="rounded-xl border px-4 py-3 text-[13px] leading-6" style={{ borderColor: "var(--border)", background: "var(--card)", color: "var(--foreground)" }}>
            교회 사무실({CHURCH.phone})로 문의해주세요. 본인 확인 후 임시 비밀번호를 발급해 드리며, 로그인 후 새
            비밀번호로 변경하시면 됩니다.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="cta-solid mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-55 motion-reduce:transform-none"
        >
          {submitting ? "로그인 중…" : "로그인"}
          {submitting ? (
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
        </button>
      </form>
      )}
    </AuthShell>
  );
}
