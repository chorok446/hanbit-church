"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Check, ArrowRight, Loader2 } from "lucide-react";
import { AuthShell, FieldInput } from "@/components/auth-shell";
import { apiPost, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { getPasswordPolicyState, isValidEmail } from "@/data/auth";

// 승인제: 서버가 토큰 대신 pendingApproval 을 내려주면 승인 대기 화면을 보여준다.
type SignupResponse =
  | { token: string; name: string; verified: boolean; pendingApproval?: undefined }
  | { pendingApproval: true; name: string };

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px]" style={{ color: ok ? "var(--accent)" : "rgba(var(--ink-rgb), 0.6)" }}>
      <Check size={14} />
      {label}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  // 법정 동의 게이트 — 이용약관(만 14세 이상 포함)·개인정보 수집·이용. 둘 다 필수.
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const passwordPolicy = getPasswordPolicyState(password);
  const canSubmit =
    isValidEmail(email) && passwordPolicy.valid && password === passwordConfirm && nickname.trim() &&
    agreeTerms && agreePrivacy;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await apiPost<SignupResponse>("/api/auth/signup", { email, password, name: nickname });
      if (res.pendingApproval) {
        // 승인제: 토큰이 발급되지 않았다 — 승인 대기 안내를 보여준다.
        setPendingName(res.name);
        return;
      }
      setSession(res.name);
      router.push("/feed");
    } catch (e) {
      setSubmitting(false);
      setError(e instanceof ApiError && e.status === 409 ? "이미 사용 중인 이메일입니다." : "회원가입에 실패했습니다.");
    }
  };

  if (pendingName !== null) {
    return (
      <AuthShell subtitle="Almost there" title="가입 신청 완료">
        <div className="space-y-5 text-center">
          <p className="text-[15px] leading-7" style={{ color: "var(--foreground)" }}>
            {pendingName}님, 가입 신청이 접수되었습니다.
            <br />
            관리자 승인이 완료되면 로그인하실 수 있어요.
          </p>
          <p className="text-[13px] leading-6" style={{ color: "rgba(var(--ink-rgb), 0.72)" }}>
            승인 여부는 교회 사무실을 통해 안내드립니다. 문의가 필요하시면 교회로 연락해 주세요.
          </p>
          <Link
            href="/"
            className="cta-solid inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-medium"
          >
            홈으로 <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      subtitle="Join the journey"
      title="회원가입"
      footer={
        <p className="text-center text-[14px] mt-4" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="underline" style={{ color: "var(--accent)" }}>
            로그인
          </Link>
        </p>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FieldInput label="이메일" name="email" autoComplete="email" icon={<Mail size={18} />} placeholder="이메일을 입력하세요" value={email} onChange={setEmail} error={error} />
        <FieldInput label="비밀번호" name="password" autoComplete="new-password" icon={<Lock size={18} />} type="password" placeholder="비밀번호를 입력하세요" value={password} onChange={setPassword} />
        <div className="flex flex-wrap gap-3 px-1">
          <Rule ok={passwordPolicy.hasLetter} label="영문" />
          <Rule ok={passwordPolicy.hasNumber} label="숫자" />
          <Rule ok={passwordPolicy.hasSpecial} label="특수문자" />
          <Rule ok={passwordPolicy.lengthValid} label="8~15자리" />
        </div>
        <FieldInput
          label="비밀번호 확인"
          name="password-confirm"
          autoComplete="new-password"
          icon={<Lock size={18} />}
          type="password"
          placeholder="비밀번호를 다시 입력하세요"
          value={passwordConfirm}
          onChange={setPasswordConfirm}
          error={passwordConfirm && password !== passwordConfirm ? "비밀번호가 일치하지 않습니다." : undefined}
        />
        {/* 교회 공동체 — 실명 가입이 원칙이다. */}
        <FieldInput label="이름(실명)" name="nickname" icon={<User size={18} />} placeholder="실명을 입력해 주세요" value={nickname} onChange={setNickname} />
        <p className="px-1 text-[12px]" style={{ color: "rgba(var(--ink-rgb), 0.55)" }}>
          교우 확인을 위해 실명으로 가입해 주세요. 가입 후 관리자 승인이 완료되면 이용하실 수 있습니다.
        </p>

        <div
          className="space-y-2.5 rounded-xl border px-4 py-3.5"
          style={{ background: "var(--card)", borderColor: "rgba(var(--ink-rgb), 0.22)" }}
        >
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              (필수) 만 14세 이상이며,{" "}
              <Link href="/terms" target="_blank" className="underline" style={{ color: "var(--accent-strong)" }}>
                이용약관
              </Link>
              에 동의합니다.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px]" style={{ color: "rgba(var(--ink-rgb), 0.8)" }}>
            <input
              type="checkbox"
              checked={agreePrivacy}
              onChange={(e) => setAgreePrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span>
              (필수){" "}
              <Link href="/privacy" target="_blank" className="underline" style={{ color: "var(--accent-strong)" }}>
                개인정보처리방침
              </Link>
              에 따른 개인정보 수집·이용에 동의합니다.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="cta-solid mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-55 motion-reduce:transform-none"
        >
          {submitting ? "가입 중…" : "회원가입"}
          {submitting ? (
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <ArrowRight size={16} aria-hidden="true" />
          )}
        </button>
      </form>
    </AuthShell>
  );
}
