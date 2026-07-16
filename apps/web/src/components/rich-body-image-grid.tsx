"use client";

import { useState } from "react";
import { FallbackImage } from "@/components/fallback-image";
import { ImageLightbox } from "@/components/image-lightbox";

/** 본문 이미지 그리드 — 4:3 크롭 썸네일을 클릭하면 라이트박스로 원본 비율 그대로 본다. */
export function RichBodyImageGrid({
  images,
  altPrefix,
}: {
  images: string[];
  altPrefix: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`${altPrefix} ${i + 1} 크게 보기`}
            className="group aspect-[4/3] cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <FallbackImage
              src={src}
              alt={`${altPrefix} ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
            />
          </button>
        ))}
      </div>
      {openIndex !== null ? (
        <ImageLightbox
          images={images}
          altPrefix={altPrefix}
          initialIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </>
  );
}
