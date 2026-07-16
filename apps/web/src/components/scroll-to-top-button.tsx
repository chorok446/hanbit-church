"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { EASE_OUT } from "@/components/scroll-reveal";

// 이만큼 내려가면 버튼을 보여준다 — 첫 화면에서는 숨겨 시선을 뺏지 않는다.
const SHOW_AFTER_PX = 480;

// 긴 목록(교제·소식·설교 등)에서 맨 위로 돌아가는 고정 버튼.
// 테마 토글(bottom-20/md:bottom-6, right-6) 바로 위에 쌓인다.
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    // 같은 값이면 React 가 재렌더를 건너뛰므로 스크롤마다 setState 해도 싸다.
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          aria-label="맨 위로"
          onClick={() => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.9 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          // 퇴장은 등장보다 절제 — 시선은 이미 다른 곳으로 이동 중이다.
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.95 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="fixed right-6 bottom-32 z-50 flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md md:bottom-18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{
            background: "rgba(var(--surface-rgb), 0.85)",
            borderColor: "var(--border)",
            color: "var(--heading)",
          }}
        >
          <ArrowUp size={16} aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
