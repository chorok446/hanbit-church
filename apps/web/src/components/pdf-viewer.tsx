"use client";

import { useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";

function formatBytes(size?: number | null): string | null {
  if (!size || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

const LINK_PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium cta-outline";

/**
 * 주보 PDF 인라인 뷰어. 백엔드가 /uploads/*.pdf 를 Content-Disposition: inline 으로 서빙하므로
 * <iframe> 으로 페이지 안에서 바로 보여준다. iframe 인라인 PDF 가 약한 일부 모바일 브라우저를 위해
 * '새 탭에서 열기'·'내려받기' 링크를 항상 병기한다. 다크모드는 CSS 토큰만 사용.
 */
export function PdfViewer({ url, name, size }: { url: string; name: string; size?: number | null }) {
  const [loaded, setLoaded] = useState(false);
  const label = name || "주보 PDF";
  const sizeLabel = formatBytes(size);

  return (
    <figure
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <figcaption
        className="flex flex-wrap items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: "var(--border)" }}
      >
        <FileText size={15} aria-hidden style={{ color: "var(--accent)" }} />
        <span className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: "var(--foreground)" }}>
          {label}
          {sizeLabel ? (
            <span className="ml-1.5 text-[11px]" style={{ color: "var(--foreground-muted)" }}>
              {sizeLabel}
            </span>
          ) : null}
        </span>
        <a href={url} target="_blank" rel="noreferrer" className={LINK_PILL}>
          <ExternalLink size={13} aria-hidden /> 새 탭에서 열기
        </a>
        <a href={url} download={label} className={LINK_PILL}>
          <Download size={13} aria-hidden /> 내려받기
        </a>
      </figcaption>

      {/* PDF 표시 영역. 모바일에서도 내부 스크롤이 가능하도록 고정 높이 + overflow. */}
      <div className="relative" style={{ background: "var(--surface)" }}>
        {!loaded ? (
          <div
            role="status"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ color: "var(--foreground-muted)" }}
          >
            <span
              className="h-7 w-7 animate-spin rounded-full border-2 motion-reduce:animate-none"
              style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }}
              aria-hidden
            />
            <span className="text-[13px]">주보를 불러오는 중입니다…</span>
          </div>
        ) : null}
        <iframe
          src={url}
          title={label}
          onLoad={() => setLoaded(true)}
          className="h-[72vh] max-h-[900px] min-h-[420px] w-full"
        />
      </div>

      <p className="px-4 py-3 text-[12px]" style={{ color: "var(--foreground-muted)" }}>
        주보가 보이지 않으면 위 <span style={{ color: "var(--foreground)" }}>새 탭에서 열기</span>를 눌러 확인하세요.
      </p>
    </figure>
  );
}
