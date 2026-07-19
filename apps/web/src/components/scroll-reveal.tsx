"use client";

import { useEffect, useRef, useState } from "react";

// 뷰포트 진입을 1회만 감지하는 IntersectionObserver 훅. framer useInView/whileInView 대체.
// once=true 동작(진입 즉시 disconnect)이며, 마운트 시 이미 보이면 곧바로 true 가 된다.
function useInViewOnce<T extends HTMLElement>(amount = 0, margin?: string) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: amount, rootMargin: margin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [amount, margin, inView]);
  return { ref, inView };
}

// 스크롤 진입 시 fade + rise. 랜딩/목록 공용 리빌 래퍼(트리거=IntersectionObserver, 모션=globals.css `.reveal`).
export function ScrollReveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className={`reveal${inView ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
      style={{ "--reveal-y": "32px", "--reveal-delay": `${delay * 1000}ms`, ...style } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// 뷰포트 진입 시 0 → to 카운트업. reduced-motion이면 즉시 최종값(숫자라 CSS 로는 못 해 JS 로 판정).
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const { ref, inView } = useInViewOnce<HTMLSpanElement>(0, "-80px");

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      el.textContent = `${to.toLocaleString()}${suffix}`;
      return;
    }
    let raf = 0;
    let startTs = 0;
    const duration = 1800;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out-quart ≈ cubic-bezier(0.16,1,0.3,1)
      el.textContent = `${Math.round(eased * to).toLocaleString()}${suffix}`;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, inView, to, suffix]);

  return <span ref={ref}>{`0${suffix}`}</span>;
}

// 목록 아이템 순차 등장. 마운트 시 1회 재생, 페이지네이션으로 리마운트되면 다시 재생(모션=globals.css `.stagger`).
export function StaggerItem({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`stagger${className ? ` ${className}` : ""}`}
      style={{ "--reveal-y": "16px", "--reveal-delay": `${Math.min(index * 0.06, 0.48) * 1000}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
