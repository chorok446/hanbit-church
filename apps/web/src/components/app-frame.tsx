"use client";

import { Toaster } from "sonner";
import { MotionConfig } from "motion/react";
import { useTheme } from "@/lib/theme-context";
import { SiteHeader } from "@/components/site-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { OfflineBanner } from "@/components/offline-banner";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { RealtimeUpdates } from "@/components/realtime-updates";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <ConfirmProvider>
      {/* reducedMotion="user" — layoutId 인디케이터 등 JS 주도 transform 애니메이션도
          OS 모션 축소 설정을 따르게 한다(CSS 쪽은 globals.css 미디어쿼리가 담당). */}
      <MotionConfig reducedMotion="user">
      {/* min-h-screen flex-col + 본문 flex-1 — 콘텐츠가 짧아도 푸터가 뷰포트 하단 이하에 붙는다. */}
      <div className="relative flex min-h-screen w-full flex-col transition-colors pb-14 md:pb-0" style={{ background: "var(--surface)" }}>
        {/* 키보드 사용자용: 고정 헤더의 링크들을 건너뛰고 본문으로 이동 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed left-4 top-4 z-50 rounded-full px-4 py-2 text-[13px] font-medium"
          style={{ background: "var(--accent)", color: "var(--surface-dark)" }}
        >
          본문 바로가기
        </a>
        <OfflineBanner />
        <SiteHeader />
        <ThemeToggle />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <Footer />
        <MobileBottomNav />
        <ScrollToTopButton />
        <RealtimeUpdates />
        <Toaster theme={theme === "dark" ? "dark" : "light"} position="bottom-center" toastOptions={{ style: { borderRadius: 16 } }} />
      </div>
      </MotionConfig>
    </ConfirmProvider>
  );
}
