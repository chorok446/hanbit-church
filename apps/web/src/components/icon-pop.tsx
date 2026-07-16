"use client";

import { motion } from "motion/react";

/**
 * 토글 확정 피드백 — active 가 켜지는 순간 아이콘이 한 번 팝(1→1.3→1)한다.
 * initial={false} 라 이미 활성 상태로 마운트되면 재생하지 않고, 꺼질 때도 팝 없이 복귀만 한다.
 * 모션 축소는 AppFrame 의 MotionConfig(reducedMotion="user")가 전역으로 처리한다.
 */
export function IconPop({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <motion.span
      className="inline-flex"
      initial={false}
      animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, times: [0, 0.4, 1], ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}
