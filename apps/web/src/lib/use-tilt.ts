"use client";

import { useRef, type MouseEvent } from "react";

/**
 * 카드 3D 마우스 틸트 — framer-motion(useMotionValue/useSpring/useTransform) 대체.
 * 포인터 위치를 rotateX/rotateY 로 변환해 CSS 변수(--tilt-rx/ry)에 imperative 하게 쓴다.
 * 스프링 관성은 `.tilt-card` 클래스의 `transition: transform`(globals.css)이 근사하고,
 * 모션 축소는 같은 클래스의 reduced-motion 규칙이 정지시킨다.
 *
 * ry/rx 는 최대 회전각(도) — 원래 useTransform([-0.5,0.5],[-ry,ry]) 매핑과 동일하게
 * 포인터 정규화값(-0.5~0.5)에 2*각도를 곱한다.
 */
export function useTilt<T extends HTMLElement = HTMLDivElement>(ry: number, rx: number) {
  const ref = useRef<T>(null);

  const onMouseMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--tilt-ry", `${px * ry * 2}deg`);
    el.style.setProperty("--tilt-rx", `${-py * rx * 2}deg`);
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-rx", "0deg");
    el.style.setProperty("--tilt-ry", "0deg");
  };

  return { ref, onMouseMove, onMouseLeave };
}
