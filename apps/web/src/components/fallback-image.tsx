"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { uploadThumbUrl } from "@/lib/upload-thumb";

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
};

export function FallbackImage({
  src,
  alt,
  className = "",
  errorText,
  decorative = false,
  thumbnail = false,
  loading = "lazy",
}: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);

  const thumbSrc = thumbnail ? uploadThumbUrl(src) : src;
  const useThumb = thumbnail && !thumbFailed && thumbSrc !== src;
  const currentSrc = useThumb ? thumbSrc : src;

  if (failed) {
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

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => (useThumb ? setThumbFailed(true) : setFailed(true))}
      aria-hidden={decorative || undefined}
    />
  );
}
