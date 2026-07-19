"use client";

import { useEffect, useState } from "react";

/**
 * 목록에 방금 추가된 항목만 부드럽게 등장시킨다. isNew 가 아닌 항목은 일반 <div> 로
 * 렌더해 목록 전체가 애니메이션 노드를 만드는 비용을 피한다(한 화면에 새 항목은 최대 1개).
 * isNew 는 마운트 시점에 래치된다 — 등장 직후 onRevealed 로 마커를 해제해도(1회용 소비)
 * 이 마운트에서는 애니메이션 노드를 유지해 진행 중인 모션이 끊기지 않는다.
 * 모션은 globals.css `.stagger`(마운트 시 fade+rise), 모션 축소는 reduced-motion 규칙이 처리.
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
    <div className="stagger" style={{ "--reveal-y": "8px", "--reveal-dur": "250ms" } as React.CSSProperties}>
      {children}
    </div>
  );
}
