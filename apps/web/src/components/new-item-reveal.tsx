"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT } from "@/components/scroll-reveal";

/**
 * 목록에 방금 추가된 항목만 부드럽게 등장시킨다. isNew 가 아닌 항목은 일반 <div> 로
 * 렌더해 목록 전체가 motion 인스턴스를 만드는 비용을 피한다(한 화면에 새 항목은 최대 1개).
 * isNew 는 마운트 시점에 래치된다 — 등장 직후 onRevealed 로 마커를 해제해도(1회용 소비)
 * 이 마운트에서는 motion.div 를 유지해 진행 중인 모션이 끊기지 않는다.
 * 모션 축소는 MotionConfig 전역 처리(transform 억제 시 opacity 페이드만 남는다).
 */
export function NewItemReveal({
  isNew,
  onRevealed,
  children,
}: {
  isNew: boolean;
  /** 등장 모션이 시작된 뒤 마커를 해제할 콜백 — 이후 리마운트에서 재생되지 않게 한다. */
  onRevealed?: () => void;
  children: React.ReactNode;
}) {
  const [reveal] = useState(isNew);
  useEffect(() => {
    if (reveal) onRevealed?.();
  }, [reveal, onRevealed]);

  if (!reveal) return <div>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
