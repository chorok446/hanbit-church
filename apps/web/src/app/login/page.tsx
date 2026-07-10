"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { AuthShell, FieldInput } from "@/components/auth-shell";
import { apiPost, ApiError, apiErrorMessage } from "@/lib/api";
import { setSession } from "@/lib/auth";

type AuthResponse = { token: string; name: string; verified: boolean };
type LoginResponse = AuthResponse | { twoFactorRequired: true; challengeToken: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 2단계 인증 — 1단계 통과 후 challengeToken 을 들고 코드 입력 단계로 전환한다.
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const finishLogin = (res: AuthResponse) => {
    setSession(res.name);
    // 보호 페이지에서 넘어온 경우 복귀(open redirect 방지: 내부 경로만 허용).
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next && next.startsWith("/") ? next : "/feed");
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
        <p className="text-center text-[14px] mt-6" style={{ color: "rgba(var(--ink-rgb), 0.7)" }}>
          아직 회원이 아니신가요?{" "}
          <Link href="/signup" className="underline" style={{ color: "var(--accent)" }}>
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
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 motion-reduce:transform-none"
            style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          >
            {submitting ? "확인 중…" : "인증하고 로그인"} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setError("");
            }}
            className="w-full text-center text-[13px] underline"
            style={{ color: "rgba(var(--ink-rgb), 0.6)" }}
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

        <div className="flex items-center justify-between text-[13px]" style={{ color: "rgba(var(--ink-rgb), 0.7)" }}>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-[var(--accent)]" />
            이메일 기억하기
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-40 motion-reduce:transform-none"
          style={{ background: "var(--cta-bg)", color: "var(--cta-fg)" }}
        >
          {submitting ? "로그인 중…" : "로그인"} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>
      )}
    </AuthShell>
  );
}
