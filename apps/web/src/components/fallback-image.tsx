"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { uploadThumbUrl } from "@/lib/upload-thumb";
import { CARD_IMAGE_SIZES, unsplashSrcSet } from "@/lib/unsplash-srcset";

type FallbackImageProps = {
  src: string;
  alt: string;
  className?: string;
  errorText?: string;
  decorative?: boolean;
  /** 목록 화면용. 업로드 이미지면 썸네일(`.thumb.jpg`)을 먼저 시도하고 없으면 원본으로 fallback 한다. */
  thumbnail?: boolean;
  /** 첫 화면(above the fold) 이미지만 "eager". 기본은 lazy — 목록·그리드가 대부분이라 대역폭을 아낀다. */
  loading?: "eager" | "lazy";
  /** srcSet 이 적용되는 unsplash 소스의 표시 폭 힌트. 기본은 카드 그리드 기준. */
  sizes?: string;
};

export function FallbackImage({
  src,
  alt,
  className = "",
  errorText,
  decorative = false,
  thumbnail = false,
  loading = "lazy",
  sizes = CARD_IMAGE_SIZES,
}: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  // 빈/공백 src 는 <img src=""> 로 렌더하면 브라우저가 현재 페이지를 재요청한다(React 경고).
  // 처음부터 폴백 UI 로 처리한다 — Avatar 의 showDefault 와 동일한 방어.
  const hasSrc = typeof src === "string" && src.trim().length > 0;
  const thumbSrc = thumbnail ? uploadThumbUrl(src) : src;
  const useThumb = thumbnail && !thumbFailed && thumbSrc !== src;
  const currentSrc = useThumb ? thumbSrc : src;

  if (failed || !hasSrc) {
    const label = errorText ?? alt;
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-1.5 px-2 text-center${errorText ? " text-[11px]" : ""}`}
        // 배경은 양 테마에서 은은한 틴트가 필요해 반투명 토큰(--border)을 그대로 쓴다.
        style={{ background: "var(--border)" }}
        role="img"
        aria-label={label || undefined}
        aria-hidden={decorative && !errorText ? true : undefined}
      >
        <ImageIcon
          size={errorText ? 20 : 24}
          style={{ color: "var(--foreground)", opacity: 0.35 }}
          aria-hidden
        />
        {errorText ? (
          <span style={{ color: "var(--foreground)", opacity: 0.5 }}>{errorText}</span>
        ) : null}
      </div>
    );
  }

  // unsplash 시드 이미지는 폭 변형 srcSet 으로 모바일에서 과대 다운로드를 막는다(실사진 교체 전까지).
  const srcSet = unsplashSrcSet(currentSrc);
  return (
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      // 외부 호스트 이미지에 열람 페이지 URL(리퍼러)을 넘기지 않는다 — 추적 표면 축소(백엔드 https 강제와 함께).
      referrerPolicy="no-referrer"
      onError={() => (useThumb ? setThumbFailed(true) : setFailed(true))}
      aria-hidden={decorative || undefined}
    />
  );
}
