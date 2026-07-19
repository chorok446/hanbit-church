"use client";

/**
 * 세그먼트 필터 칩 그룹 — 활성 배경 필(골드)이 선택된 칩에 표시된다.
 * 교제 카테고리·행사 필터·알림 필터가 공유하는 단일 선택 UI 관용구.
 * layoutId 슬라이드(칩 사이 이동)는 CSS 로 옮기며 활성 칩에 즉시 페이드(.indicator-fade)로 대체한다.
 * 모션 축소는 globals.css 의 reduced-motion 규칙이 처리한다.
 */
export function FilterPillGroup({
  items,
  value,
  onChange,
  label,
  className = "w-fit rounded-full",
}: {
  items: readonly { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
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
            className="relative min-h-11 shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={{ color: active ? "var(--surface-dark)" : "var(--foreground-muted)" }}
          >
            {active ? (
              <span
                className="indicator-fade absolute inset-0"
                style={{ background: "var(--accent)", borderRadius: 9999 }}
                aria-hidden
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
