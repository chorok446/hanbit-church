"use client";

import { motion } from "motion/react";

/**
 * 세그먼트 필터 칩 그룹 — 활성 배경 필(골드)이 layoutId 로 선택을 따라 이동한다.
 * 교제 카테고리·행사 필터·알림 필터가 공유하는 단일 선택 UI 관용구.
 * - borderRadius 는 className 이 아닌 style 로 준다: Motion 의 layout 스케일 애니메이션이
 *   반경을 보정하는 건 style 지정일 때뿐이라, 폭이 다른 칩 사이를 날 때 모서리가 안 찌그러진다.
 * - 모션 축소는 AppFrame 의 MotionConfig(reducedMotion="user")가 전역 처리한다.
 */
export function FilterPillGroup({
  items,
  value,
  onChange,
  layoutId,
  label,
  className = "w-fit rounded-full",
}: {
  items: readonly { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  /** 페이지 내 유일해야 한다 — 같은 layoutId 끼리 필이 이동한다. */
  layoutId: string;
  /** 그룹 접근성 라벨 (예: "카테고리 필터"). */
  label: string;
  /** 컨테이너 폭·모서리 변형 (예: 행사 필터의 "w-full rounded-3xl md:w-fit md:rounded-full"). */
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap gap-1 p-1 ${className}`}
      style={{ background: "rgba(var(--ink-rgb), 0.06)" }}
    >
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.key)}
            className="relative shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: active ? "var(--surface-dark)" : "var(--foreground-muted)" }}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0"
                style={{ background: "var(--accent)", borderRadius: 9999 }}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
