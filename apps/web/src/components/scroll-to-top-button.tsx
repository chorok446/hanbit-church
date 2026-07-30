"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

// 이만큼 내려가면 버튼을 보여준다 — 첫 화면에서는 숨겨 시선을 뺏지 않는다.
const SHOW_AFTER_PX = 480;

// 긴 목록(교제·소식·설교 등)에서 맨 위로 돌아가는 고정 버튼.
// 테마 토글(bottom-20/md:bottom-6, right-6) 바로 위에 쌓인다.
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 같은 값이면 React 가 재렌더를 건너뛰므로 스크롤마다 setState 해도 싸다.
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 등장은 CSS `.rise-pop`(fade+rise+scale). 퇴장 모션은 없이 언마운트한다(시선은 이미 이동 중).
  // scroll-behavior 는 reduced-motion 시 globals.css 가 auto 로 강제하므로 항상 smooth 로 요청해도 안전.
  if (!visible) return null;
  return (
    <button
      type="button"
      aria-label="맨 위로"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="rise-pop fixed right-6 bottom-20 z-50 flex h-9 w-9 items-center justify-center rounded-full border shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md lg:bottom-18 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      style={{
        background: "rgba(var(--surface-rgb), 0.85)",
        borderColor: "var(--border)",
        color: "var(--heading)",
      }}
    >
      <ArrowUp size={16} aria-hidden />
    </button>
  );
}
