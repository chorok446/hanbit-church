"use client";

import { useId } from "react";
import { useTilt } from "@/lib/use-tilt";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(10, 8);

  return (
    <section
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-28 transition-colors sm:px-6 sm:py-32"
      style={{
        position: "relative",
        perspective: 1400,
        backgroundImage: "var(--auth-gradient)",
      }}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[var(--accent)] blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full bg-[#e7dfcb] blur-[140px]" />
      </div>

      <div ref={ref} className="tilt-card relative w-full max-w-md">
        <div
          style={{ transform: "translateZ(60px)" }}
          className="rounded-3xl border p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10"
        >
          <div
            style={{
              // 배경 그라디언트가 비쳐 뿌옇게 보이지 않도록 표면색을 거의 불투명(0.97)하게 깔고
              // blur 는 가장자리 질감만 남긴다. 테두리도 한 단계 진하게.
              background: "rgba(var(--surface-rgb), 0.97)",
              borderColor: "rgba(var(--ink-rgb), 0.16)",
              borderWidth: 1,
              borderStyle: "solid",
            }}
            className="absolute inset-0 rounded-3xl -z-10"
          />
          <div style={{ transform: "translateZ(20px)" }} className="relative">
            <p
              className="tracking-[0.4em] uppercase mb-3"
              style={{ color: "var(--accent-secondary)", fontSize: 11 }}
            >
              {subtitle}
            </p>
            <h1
              style={{
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 44,
                color: "var(--foreground)",
              }}
            >
              {title}
            </h1>
            <div className="mt-8 space-y-4">{children}</div>
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>

        {/* 카드 우상단에 띄우던 교회명 배지는 카드·제목과 겹쳐 보여 제거 — 로고는 상단 헤더에 이미 있다. */}
      </div>
    </section>
  );
}

export function FieldInput({
  icon,
  label,
  name,
  type = "text",
  autoComplete,
  placeholder,
  error,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  name?: string;
  type?: string;
  autoComplete?: string;
  placeholder: string;
  error?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="sr-only">{label}</label>
      <div
        className="relative flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-[border-color,box-shadow,background-color] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/20"
        style={{
          // 카드와 같은 유리 톤이면 경계가 사라진다 — 입력은 불투명 카드색 + 뚜렷한 테두리.
          background: "var(--card)",
          borderColor: "rgba(var(--ink-rgb), 0.22)",
        }}
      >
        <span style={{ color: "rgba(var(--ink-rgb), 0.65)" }}>{icon}</span>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className="flex-1 bg-transparent outline-none placeholder:text-[rgba(var(--ink-rgb),0.62)]"
          style={{ color: "var(--foreground)" }}
        />
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 pl-1 text-[12px]" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
