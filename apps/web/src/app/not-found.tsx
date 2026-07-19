"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import { useTilt } from "@/lib/use-tilt";

export default function NotFound() {
  // 마우스 위치를 CSS 변수(--tilt-rx/ry)로 쓰고 안쪽 .tilt-card 가 상속받아 회전한다(변수 상속).
  const { ref, onMouseMove, onMouseLeave } = useTilt<HTMLElement>(25, 18);

  return (
    <section
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative min-h-screen flex items-center justify-center overflow-hidden transition-colors"
      style={{
        position: "relative",
        perspective: 1400,
        backgroundImage: "var(--auth-gradient)",
      }}
    >
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full bg-[var(--accent)] blur-[140px]" />
      </div>

      <div className="tilt-card relative text-center">
        <div style={{ transform: "translateZ(120px)" }}>
          <span
            style={{
              fontFamily: "var(--font-display)", fontWeight: 600,
              fontSize: "clamp(160px, 22vw, 280px)",
              lineHeight: 1,
              backgroundImage: "linear-gradient(180deg,#c9a227,#8a6f1c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: "0 30px 60px rgba(0,0,0,0.3)",
            }}
          >
            404
          </span>
        </div>
        <p
          style={{
            transform: "translateZ(60px)",
            color: "rgba(var(--ink-rgb), 0.85)",
            fontFamily: "var(--font-display)", fontWeight: 600,
            fontSize: "clamp(24px, 3vw, 36px)",
          }}
          className="mt-4"
        >
          페이지를 찾을 수 없습니다
        </p>
        <Link
          href="/"
          style={{ transform: "translateZ(90px)", background: "var(--cta-bg)", color: "var(--cta-fg)" }}
          className="mt-10 inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-medium hover:-translate-y-0.5 transition-transform shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)]"
        >
          <Home size={16} /> 메인페이지로 이동하기
        </Link>
      </div>
    </section>
  );
}
