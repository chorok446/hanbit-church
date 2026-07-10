"use client";

import { useState } from "react";
import { Leaf, User } from "lucide-react";
import { uploadThumbUrl } from "@/lib/upload-thumb";

type AvatarProps = {
  name: string;
  verified?: boolean;
  size?: number;
  src?: string;
};

/** 프로필 사진이 없을 때의 기본 아바타 — 딥네이비 바탕 + 이름 첫 글자(명조). 이름이 없으면 사람 아이콘. */
function DefaultAvatar({ name, size }: { name: string; size: number }) {
  const initial = name.trim().charAt(0);
  if (!initial) {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border"
        style={{ background: "rgba(var(--ink-rgb), 0.14)", borderColor: "rgba(var(--ink-rgb), 0.12)" }}
        aria-hidden
      >
        <User size={Math.round(size * 0.52)} color={"rgba(var(--ink-rgb), 0.6)"} strokeWidth={1.75} />
      </div>
    );
  }
  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-full"
      style={{ background: "var(--banner-bg)" }}
      aria-hidden
    >
      <span
        className="select-none"
        style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: Math.round(size * 0.44), color: "var(--on-banner)", lineHeight: 1 }}
      >
        {initial}
      </span>
    </div>
  );
}

export function Avatar({ name, verified, size = 32, src }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const showDefault = !src || failed;

  // 업로드 프로필 이미지는 작은 썸네일을 먼저 시도하고, 없으면(과거 업로드·webp) 원본으로 fallback.
  const thumbSrc = src ? uploadThumbUrl(src) : undefined;
  const useThumb = Boolean(thumbSrc && thumbSrc !== src && !thumbFailed);
  const currentSrc = useThumb ? thumbSrc : src;

  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      {showDefault ? (
        <DefaultAvatar name={name} size={size} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={`${name} 프로필 이미지`}
          onError={() => (useThumb ? setThumbFailed(true) : setFailed(true))}
          className="h-full w-full rounded-full object-cover"
          draggable={false}
        />
      )}
      {verified && (
        <div
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-[var(--accent)] ring-1 ring-white"
          style={{ width: Math.max(12, size * 0.42), height: Math.max(12, size * 0.42) }}
        >
          <Leaf size={Math.max(7, size * 0.24)} color="var(--surface-dark)" />
        </div>
      )}
    </div>
  );
}
