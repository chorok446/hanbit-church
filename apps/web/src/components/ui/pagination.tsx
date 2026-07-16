"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * "1 … 4 [5] 6 … 12" 형태의 번호 목록. 현재 페이지 앞뒤 1개 + 양끝을 항상 보여주고
 * 건너뛴 구간은 ellipsis(-1)로 표시한다. 페이지가 적으면(≤7) 전부 나열.
 */
function pageItems(page: number, totalPages: number): number[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
  const wanted = new Set([0, 1, page - 1, page, page + 1, totalPages - 2, totalPages - 1]);
  const pages = [...wanted].filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const items: number[] = [];
  for (const p of pages) {
    if (items.length > 0) {
      const prev = items[items.length - 1];
      if (p - prev === 2) items.push(p - 1); // 한 칸 빈 틈은 그냥 채운다
      else if (p - prev > 2) items.push(-1); // ellipsis
    }
    items.push(p);
  }
  return items;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  disabled = false,
  compact = false,
  className = "",
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalElements?: number;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 0) return null;

  const borderColor = "rgba(var(--ink-rgb), 0.15)";
  const foreground = "var(--foreground)";
  const navButtonClass = `hit-area inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 motion-reduce:transform-none ${compact ? "h-9 w-9 rounded-full text-[12px]" : "h-10 w-10 rounded-xl text-[13px]"}`;
  const numberButtonClass = `inline-flex items-center justify-center border transition-[background-color,border-color,box-shadow] disabled:opacity-40 ${compact ? "h-9 min-w-9 rounded-full px-2 text-[12px]" : "h-10 min-w-10 rounded-xl px-2.5 text-[13px]"}`;

  return (
    <nav
      aria-label="페이지 탐색"
      aria-busy={disabled || undefined}
      className={`flex flex-col items-center gap-3 sm:flex-row ${totalElements === undefined ? "sm:justify-center" : "sm:justify-between"} ${className}`}
      style={{ color: foreground }}
    >
      {totalElements === undefined ? null : (
        <span className="text-[12px] opacity-65">
          총 {totalElements.toLocaleString()}개 · {page + 1} / {totalPages} 페이지
        </span>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {totalPages > 7 ? (
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={disabled || page <= 0}
            className={navButtonClass}
            style={{ borderColor, background: "var(--glass)" }}
            aria-label="첫 페이지"
          >
            <ChevronsLeft size={15} aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={disabled || page <= 0}
          className={navButtonClass}
          style={{ borderColor, background: "var(--glass)" }}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>

        {pageItems(page, totalPages).map((item, index) =>
          item === -1 ? (
            <span key={`gap-${index}`} aria-hidden className="px-1 text-[13px] opacity-50">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled || item === page}
              aria-label={`${item + 1} 페이지`}
              aria-current={item === page ? "page" : undefined}
              className={numberButtonClass}
              style={
                item === page
                  ? { borderColor: "var(--cta-bg)", background: "var(--cta-bg)", color: "var(--cta-fg)" }
                  : { borderColor, background: "var(--glass)" }
              }
            >
              {item + 1}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page + 1 >= totalPages}
          className={navButtonClass}
          style={{ borderColor, background: "var(--glass)" }}
          aria-label="다음 페이지"
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>
        {totalPages > 7 ? (
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={disabled || page + 1 >= totalPages}
            className={navButtonClass}
            style={{ borderColor, background: "var(--glass)" }}
            aria-label="마지막 페이지"
          >
            <ChevronsRight size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </nav>
  );
}
