"use client";

import { Play } from "lucide-react";
import { FallbackImage } from "@/components/fallback-image";

export type SermonThumbMeta = {
  serviceLabel: string;
  title: string;
  scripture: string | null;
};

/**
 * 설교 카드 썸네일. 우선순위:
 *  1) 유튜브 영상이 있으면 실제 썸네일 + 작은 재생 아이콘
 *  2) meta 가 있으면 네이비 placeholder 에 카테고리·제목·성경 본문을 얹고 "영상 준비 중" 상태 표기
 *  3) 둘 다 없으면 골드 십자가 + "설교 말씀" 기본 블록(이미지 파일 불필요)
 * --banner-bg 는 양 테마 모두 네이비라 크림(#f6f3ea) 텍스트를 그대로 쓴다(home-visit 배너와 동일 관례).
 */
export function SermonThumb({
  youtubeId,
  meta,
  className = "",
}: {
  youtubeId: string | null;
  meta?: SermonThumbMeta;
  className?: string;
}) {
  if (youtubeId) {
    return (
      <div className={`relative overflow-hidden ${className}`.trim()}>
        <FallbackImage
          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
          alt=""
          decorative
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(22, 32, 58, 0.35)" }}>
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "rgba(246, 243, 234, 0.92)", color: "#1f2a44" }}
            aria-hidden
          >
            <Play size={13} fill="currentColor" />
          </span>
        </div>
      </div>
    );
  }

  if (meta) {
    return (
      <div
        className={`flex flex-col justify-between gap-4 overflow-hidden p-5 sm:p-6 ${className}`.trim()}
        style={{ background: "var(--banner-bg)" }}
        aria-hidden
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--accent)" }}>
            <span className="h-px w-5 shrink-0" style={{ background: "var(--accent)" }} />
            {meta.serviceLabel}
          </p>
          <p
            className="mt-2.5 line-clamp-2 text-[17px] leading-snug text-[#f6f3ea] sm:text-[19px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
          >
            {meta.title}
          </p>
          {meta.scripture ? (
            <p className="mt-1.5 truncate text-[12.5px] text-[#f6f3ea] opacity-65" style={{ fontFamily: "var(--font-display)" }}>
              {meta.scripture}
            </p>
          ) : null}
        </div>
        <p
          className="inline-flex items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[11px] text-[#f6f3ea] opacity-80"
          style={{ borderColor: "rgba(246, 243, 234, 0.3)" }}
        >
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--accent)" }} />
          영상 준비 중
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 ${className}`.trim()}
      style={{ background: "var(--banner-bg)" }}
      aria-hidden
    >
      <span style={{ color: "var(--accent)", fontSize: 20, lineHeight: 1 }}>✝</span>
      <span
        className="text-[12.5px] tracking-[0.24em] text-[#f6f3ea]"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}
      >
        설교 말씀
      </span>
      <span className="h-px w-8" style={{ background: "var(--accent)" }} />
    </div>
  );
}
