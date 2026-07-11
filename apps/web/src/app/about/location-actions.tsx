"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const ACTION_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium cta-outline";

/** 오시는 길 액션 버튼 — 주소 복사(클립보드 + toast), 카카오맵·네이버지도 새 탭 열기. */
export function LocationActions({ address }: { address: string }) {
  const encoded = encodeURIComponent(address);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("주소가 복사되었습니다.");
    } catch {
      toast.error("복사하지 못했습니다. 주소를 직접 선택해 복사해주세요.");
    }
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button type="button" onClick={copyAddress} className={ACTION_CLASS}>
        <Copy size={14} aria-hidden style={{ color: "var(--accent)" }} />
        주소 복사
      </button>
      <a
        href={`https://map.kakao.com/link/search/${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className={ACTION_CLASS}
      >
        <ExternalLink size={14} aria-hidden style={{ color: "var(--accent)" }} />
        카카오맵 보기
      </a>
      <a
        href={`https://map.naver.com/v5/search/${encoded}`}
        target="_blank"
        rel="noopener noreferrer"
        className={ACTION_CLASS}
      >
        <ExternalLink size={14} aria-hidden style={{ color: "var(--accent)" }} />
        네이버지도 보기
      </a>
    </div>
  );
}
