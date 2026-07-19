"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 토글 확정 피드백 — active 가 꺼짐→켜짐으로 바뀌는 순간 아이콘이 한 번 팝(1→1.3→1)한다.
 * 마운트 시 이미 active 면 재생하지 않고(원래 initial={false}), 꺼질 때도 팝 없이 복귀한다.
 * 애니메이션이 끝나면 클래스를 떼어 다음 활성화 때 다시 재생되게 한다.
 * 모션 축소는 globals.css 의 reduced-motion 규칙이 애니메이션을 정지시킨다.
 */
export function IconPop({ active, children }: { active: boolean; children: React.ReactNode }) {
  const [popping, setPopping] = useState(false);
  const prev = useRef(active);
  useEffect(() => {
    if (active && !prev.current) setPopping(true);
    prev.current = active;
  }, [active]);

  return (
    <span
      className={`inline-flex${popping ? " icon-pop" : ""}`}
      onAnimationEnd={() => setPopping(false)}
    >
      {children}
    </span>
  );
}
