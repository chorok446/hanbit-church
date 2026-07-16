"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { uploadThumbUrl } from "@/lib/upload-thumb";
import { CARD_IMAGE_SIZES, unsplashSrcSet } from "@/lib/unsplash-srcset";

/**
 * 행사 썸네일. 이미지가 없거나 로드에 실패하면 네이비(--banner-bg)·골드(--accent)
 * placeholder 로 대체한다(sermon-thumb 관례 — 크림 var(--on-banner) 텍스트).
 * TODO(교회 확인: 실제 행사 사진 교체) — 시드 unsplash 이미지가 행사 맥락과 안 맞는 것들이 있어
 * 백엔드 시드 교체 전까지는 placeholder 와 alt 안정화로 대응한다.
 */
export function EventThumb({
  src,
  alt,
  className = "",
  thumbnail = false,
  loading = "lazy",
  sizes = CARD_IMAGE_SIZES,
}: {
  src: string;
  alt: string;
  className?: string;
  /** 목록 화면용. 업로드 이미지면 썸네일(`.thumb.jpg`)을 먼저 시도하고 없으면 원본으로 fallback 한다. */
  thumbnail?: boolean;
  /** 첫 화면(상세 헤더 등) 이미지만 "eager". 기본 lazy. */
  loading?: "eager" | "lazy";
  /** srcSet 이 적용되는 unsplash 소스의 표시 폭 힌트. */
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const trimmed = src.trim();
  const thumbSrc = thumbnail && trimmed ? uploadThumbUrl(trimmed) : trimmed;
  const useThumb = thumbnail && !thumbFailed && thumbSrc !== trimmed;

  if (!trimmed || failed) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 ${className}`.trim()}
        style={{ background: "var(--banner-bg)" }}
        role="img"
        aria-label={alt || undefined}
      >
        <span style={{ color: "var(--accent)", fontSize: 20, lineHeight: 1 }} aria-hidden>✝</span>
        <span
          className="text-[12.5px] tracking-[0.24em] text-[var(--on-banner)]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
        >
          행사·사역
        </span>
        <span className="h-px w-8" style={{ background: "var(--accent)" }} aria-hidden />
      </div>
    );
  }

  const finalSrc = useThumb ? thumbSrc : trimmed;
  const srcSet = unsplashSrcSet(finalSrc);
  return (
    <img
      src={finalSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => (useThumb ? setThumbFailed(true) : setFailed(true))}
    />
  );
}
