"use client";

import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
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
