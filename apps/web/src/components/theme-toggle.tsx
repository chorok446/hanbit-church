"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

// hydration 완료 여부. useAuthSession 과 같은 패턴 — 이펙트 내 setState 없이
// 서버 스냅샷(false)/클라이언트 스냅샷(true)으로 첫 렌더를 SSR 과 일치시킨다.
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** 모바일 시트 메뉴 안의 테마 전환 행 — 플로팅 pill 은 데스크톱 전용이라 모바일은 이 행이 담당한다. */
export function ThemeToggleMenuRow() {
  const { theme, toggle } = useTheme();
  const hydrated = useHydrated();
  const dark = hydrated && theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-[15px] transition-colors hover:bg-[rgba(var(--ink-rgb),0.06)]"
      style={{ color: "var(--heading)" }}
    >
      <span className="flex items-center gap-2.5">
        {dark ? <Moon size={16} aria-hidden /> : <Sun size={16} aria-hidden />}
        화면 모드
      </span>
      <span className="text-[13px]" style={{ color: "var(--foreground-muted)" }}>
        {dark ? "다크" : "라이트"}
      </span>
    </button>
  );
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
      className="fixed bottom-6 right-6 z-50 hidden h-9 w-16 rounded-full border p-1 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors lg:block"
      style={{
        // 네이비 푸터 위에서도 묻히지 않도록 불투명 패널 배경 + 그림자.
        background: "var(--panel)",
        borderColor: "var(--border)",
      }}
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
    >
      {/* 라이트(해)가 왼쪽, 다크(달)가 오른쪽 — translateX 슬라이드는 CSS transition(모션 축소 시 자동 정지). */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ease-out"
        style={{ background: "var(--accent-secondary)", color: "var(--surface)", transform: dark ? "translateX(28px)" : "translateX(0)" }}
      >
        {dark ? <Moon size={14} /> : <Sun size={14} />}
      </div>
    </button>
  );
}
