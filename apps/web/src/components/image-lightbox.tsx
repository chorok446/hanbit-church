"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FallbackImage } from "@/components/fallback-image";
import { useModalDialog } from "@/lib/use-modal-dialog";

// 검은 backdrop 위 고정 스크림 — 테마와 무관하게 어두운 면이라 --surface-dark 기반으로 만든다.
const scrimStyle = {
  background: "color-mix(in srgb, var(--surface-dark) 65%, transparent)",
  color: "var(--on-banner)",
} as const;

/**
 * 본문 이미지 원본 보기 라이트박스 — 공용 useModalDialog(포커스 트랩·Esc·backdrop 클릭)와
 * 확인 다이얼로그의 dialog-pop 등장 모션(globals.css)을 재사용한다.
 * 여러 장이면 ←/→ 키와 좌우 버튼으로 순환 이동한다.
 */
export function ImageLightbox({
  images,
  altPrefix,
  initialIndex,
  onClose,
}: {
  images: string[];
  altPrefix: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const { dialogRef, onBackdropClick } = useModalDialog(onClose);
  const [index, setIndex] = useState(initialIndex);
  const count = images.length;
  // 열려 있는 동안 images 가 줄어도(백그라운드 재조회) 범위를 벗어나지 않게 클램프.
  const safeIndex = Math.min(Math.max(index, 0), Math.max(count - 1, 0));

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  if (count === 0) return null;

  const navButtonClass =
    "absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

  return (
    <dialog
      ref={dialogRef}
      aria-label={`${altPrefix} 크게 보기`}
      className="dialog-pop bg-transparent p-0 backdrop:bg-black/80"
      onKeyDown={(event) => {
        if (count < 2) return;
        if (event.key === "ArrowLeft") prev();
        if (event.key === "ArrowRight") next();
      }}
      onClick={onBackdropClick}
    >
      {/* 깨진 이미지 폴백(FallbackImage)이 표시될 최소 면적을 flex 컨테이너로 확보한다. */}
      <div className="relative flex min-h-[10rem] min-w-[min(80vw,18rem)] items-center justify-center">
        <FallbackImage
          src={images[safeIndex]}
          alt={`${altPrefix} ${safeIndex + 1} 크게 보기`}
          errorText="이미지를 불러오지 못했습니다"
          sizes="92vw"
          className="max-h-[85vh] max-w-[92vw] rounded-2xl object-contain"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={scrimStyle}
        >
          <X size={18} />
        </button>
        {count > 1 ? (
          <>
            <button type="button" onClick={prev} aria-label="이전 이미지" className={`${navButtonClass} left-2`} style={scrimStyle}>
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={next} aria-label="다음 이미지" className={`${navButtonClass} right-2`} style={scrimStyle}>
              <ChevronRight size={20} />
            </button>
            <span
              aria-live="polite"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-1 text-[12px] font-medium"
              style={scrimStyle}
            >
              {safeIndex + 1} / {count}
            </span>
          </>
        ) : null}
      </div>
    </dialog>
  );
}
