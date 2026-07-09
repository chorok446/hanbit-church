"use client";

import { useId, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

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
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 150, damping: 20 });
  const sy = useSpring(my, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);

  function onMove(e: React.MouseEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <section
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
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

      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full max-w-md"
      >
        <motion.div
          style={{ transform: "translateZ(60px)" }}
          className="rounded-3xl border p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:p-10"
        >
          <div
            style={{
              background: "var(--glass)",
              borderColor: "rgba(var(--ink-rgb), 0.09)",
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
        </motion.div>

        {/* 카드 우상단에 띄우던 교회명 배지는 카드·제목과 겹쳐 보여 제거 — 로고는 상단 헤더에 이미 있다. */}
      </motion.div>
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
          background: "var(--glass-strong)",
          borderColor: "rgba(var(--ink-rgb), 0.1)",
        }}
      >
        <span style={{ color: "rgba(var(--ink-rgb), 0.5)" }}>{icon}</span>
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
          className="flex-1 bg-transparent outline-none placeholder:opacity-70"
          style={{ color: "var(--foreground)" }}
        />
      </div>
      {error && <p id={errorId} role="alert" className="mt-1.5 pl-1 text-[12px]" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  );
}
