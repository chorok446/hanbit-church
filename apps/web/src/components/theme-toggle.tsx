"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "@/lib/theme-context";

// hydration 완료 여부. useAuthSession 과 같은 패턴 — 이펙트 내 setState 없이
// 서버 스냅샷(false)/클라이언트 스냅샷(true)으로 첫 렌더를 SSR 과 일치시킨다.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const hydrated = useHydrated();
  // 첫 클라이언트 렌더는 SSR(항상 light)과 동일해야 한다 — localStorage 가 dark 여도
  // hydration 이 끝난 뒤에 실제 테마로 갱신한다. 안 그러면 aria-label/아이콘 불일치로
  // React #418(전체 트리 클라이언트 재생성)이 다크 사용자 매 로드마다 발생한다.
  const dark = hydrated && theme === "dark";
  return (
    <button
      onClick={toggle}
      className="fixed bottom-20 right-6 z-50 h-9 w-16 rounded-full border p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors md:bottom-6"
      style={{
        // 네이비 푸터 위에서도 묻히지 않도록 불투명 패널 배경 + 그림자.
        background: "var(--panel)",
        borderColor: "var(--border)",
      }}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {/* 라이트(해)가 왼쪽, 다크(달)가 오른쪽 */}
      <motion.div
        animate={{ x: dark ? 28 : 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "var(--accent-secondary)", color: "var(--surface)" }}
      >
        {dark ? <Moon size={14} /> : <Sun size={14} />}
      </motion.div>
    </button>
  );
}
